import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth-guard"

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const projects = await db.project.findMany({
      where: {
        OR: [
          { createdById: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          },
        },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: "desc" },
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error("Get projects error:", error)
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, memberIds } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        createdById: user.id,
        members: {
          create: [
            { userId: user.id, role: "ADMIN" },
            ...(memberIds || [])
              .filter((id: string) => id !== user.id)
              .map((id: string) => ({ userId: id, role: "MEMBER" })),
          ],
        },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error("Create project error:", error)
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 })
  }
}
