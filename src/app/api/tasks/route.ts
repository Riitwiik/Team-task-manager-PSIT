import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth-guard"

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("projectId")
    const status = searchParams.get("status")
    const priority = searchParams.get("priority")
    const assigneeId = searchParams.get("assigneeId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    const where: any = {
      OR: [
        { assigneeId: user.id },
        { createdById: user.id },
        { project: { members: { some: { userId: user.id } } } },
      ],
    }

    if (projectId) where.projectId = projectId
    if (status) where.status = status
    if (priority) where.priority = priority
    if (assigneeId) where.assigneeId = assigneeId

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, status: true } },
          assignee: { select: { id: true, name: true, email: true, avatar: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.task.count({ where }),
    ])

    return NextResponse.json({ tasks, total, page, limit })
  } catch (error) {
    console.error("Get tasks error:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, status, priority, dueDate, projectId, assigneeId } = body

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 })
    }

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 })
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const isMember = project.members.some((m) => m.userId === user.id)
    if (!isMember && user.role !== "ADMIN") {
      return NextResponse.json({ error: "You are not a member of this project" }, { status: 403 })
    }

    if (assigneeId) {
      const assigneeMember = project.members.find((m) => m.userId === assigneeId)
      if (!assigneeMember) {
        return NextResponse.json({ error: "Assignee is not a member of this project" }, { status: 400 })
      }
    }

    const validStatuses = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"]
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"]

    const task = await db.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: validStatuses.includes(status) ? status : "TODO",
        priority: validPriorities.includes(priority) ? priority : "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        assigneeId: assigneeId || null,
        createdById: user.id,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Create task error:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
