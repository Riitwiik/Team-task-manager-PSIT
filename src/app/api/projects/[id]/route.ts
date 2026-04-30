import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser, isProjectAdmin } from "@/lib/auth-guard"

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
    const project = await db.project.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
          },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true, avatar: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const isMember = project.members.some((m) => m.userId === user.id)
    if (!isMember && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error("Get project error:", error)
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 })
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
    const project = await db.project.findUnique({
      where: { id },
      include: { members: true },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const canEdit = user.role === "ADMIN" || isProjectAdmin(project.members, user.id) || project.createdById === user.id
    if (!canEdit) {
      return NextResponse.json({ error: "Only project admins can edit this project" }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, status } = body

    const updated = await db.project.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status }),
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

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Update project error:", error)
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 })
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
    const project = await db.project.findUnique({
      where: { id },
      include: { members: true },
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    const canDelete = user.role === "ADMIN" || project.createdById === user.id
    if (!canDelete) {
      return NextResponse.json({ error: "Only project creators or admins can delete projects" }, { status: 403 })
    }

    await db.project.delete({ where: { id } })

    return NextResponse.json({ message: "Project deleted successfully" })
  } catch (error) {
    console.error("Delete project error:", error)
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
