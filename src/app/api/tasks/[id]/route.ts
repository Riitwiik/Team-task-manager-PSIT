import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth-guard"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const task = await db.task.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, status: true },
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, avatar: true } },
              },
            },
          },
        },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const isMember = task.project.members.some((m: any) => m.userId === user.id)
    if (!isMember && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Get task error:", error)
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const existingTask = await db.task.findUnique({
      where: { id },
      include: {
        project: { include: { members: true } },
      },
    })

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const isMember = existingTask.project.members.some((m) => m.userId === user.id)
    if (!isMember && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const body = await req.json()
    const { title, description, status, priority, dueDate, assigneeId } = body

    const validStatuses = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"]
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"]

    const updated = await db.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && validStatuses.includes(status) && { status }),
        ...(priority && validPriorities.includes(priority) && { priority }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update task error:", error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const task = await db.task.findUnique({
      where: { id },
      include: {
        project: { include: { members: true } },
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const canDelete =
      user.role === "ADMIN" ||
      task.createdById === user.id ||
      task.project.members.some((m) => m.userId === user.id && m.role === "ADMIN")

    if (!canDelete) {
      return NextResponse.json({ error: "Only task creators or project admins can delete tasks" }, { status: 403 })
    }

    await db.task.delete({ where: { id } })

    return NextResponse.json({ message: "Task deleted successfully" })
  } catch (error) {
    console.error("Delete task error:", error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
