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
    const members = await db.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, avatar: true } },
      },
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error("Get members error:", error)
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}

export async function POST(
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

    const canManage = user.role === "ADMIN" || isProjectAdmin(project.members, user.id) || project.createdById === user.id
    if (!canManage) {
      return NextResponse.json({ error: "Only project admins can add members" }, { status: 403 })
    }

    const body = await req.json()
    const { userId, role } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const existingMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId: id, userId } },
    })

    if (existingMember) {
      return NextResponse.json({ error: "User is already a member of this project" }, { status: 409 })
    }

    const member = await db.projectMember.create({
      data: {
        projectId: id,
        userId,
        role: role === "ADMIN" ? "ADMIN" : "MEMBER",
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error("Add member error:", error)
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 })
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

    const canManage = user.role === "ADMIN" || isProjectAdmin(project.members, user.id) || project.createdById === user.id
    if (!canManage) {
      return NextResponse.json({ error: "Only project admins can remove members" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (userId === project.createdById) {
      return NextResponse.json({ error: "Cannot remove project creator" }, { status: 400 })
    }

    await db.projectMember.deleteMany({
      where: { projectId: id, userId },
    })

    return NextResponse.json({ message: "Member removed successfully" })
  } catch (error) {
    console.error("Remove member error:", error)
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
  }
}
