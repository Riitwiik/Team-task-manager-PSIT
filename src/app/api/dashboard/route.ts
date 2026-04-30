import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthUser } from "@/lib/auth-guard"

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = user.id

    const [
      totalProjects,
      totalTasks,
      todoTasks,
      inProgressTasks,
      reviewTasks,
      doneTasks,
      overdueTasks,
      recentTasks,
      myTasks,
    ] = await Promise.all([
      db.project.count({
        where: {
          OR: [
            { createdById: userId },
            { members: { some: { userId } } },
          ],
        },
      }),
      db.task.count({
        where: {
          OR: [
            { assigneeId: userId },
            { createdById: userId },
            { project: { members: { some: { userId } } } },
          ],
        },
      }),
      db.task.count({
        where: {
          status: "TODO",
          OR: [
            { assigneeId: userId },
            { project: { members: { some: { userId } } } },
          ],
        },
      }),
      db.task.count({
        where: {
          status: "IN_PROGRESS",
          OR: [
            { assigneeId: userId },
            { project: { members: { some: { userId } } } },
          ],
        },
      }),
      db.task.count({
        where: {
          status: "REVIEW",
          OR: [
            { assigneeId: userId },
            { project: { members: { some: { userId } } } },
          ],
        },
      }),
      db.task.count({
        where: {
          status: "DONE",
          OR: [
            { assigneeId: userId },
            { project: { members: { some: { userId } } } },
          ],
        },
      }),
      db.task.count({
        where: {
          dueDate: { lt: new Date() },
          status: { not: "DONE" },
          OR: [
            { assigneeId: userId },
            { project: { members: { some: { userId } } } },
          ],
        },
      }),
      db.task.findMany({
        where: {
          OR: [
            { assigneeId: userId },
            { createdById: userId },
            { project: { members: { some: { userId } } } },
          ],
        },
        include: {
          project: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      db.task.count({
        where: { assigneeId: userId, status: { not: "DONE" } },
      }),
    ])

    const projectsList = await db.project.findMany({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        _count: { select: { tasks: true, members: true } },
        tasks: {
          where: { status: "DONE" },
          select: { id: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    })

    const projectStats = projectsList.map((p) => ({
      ...p,
      completionRate: p._count.tasks > 0 ? Math.round((p.tasks.length / p._count.tasks) * 100) : 0,
    }))

    return NextResponse.json({
      totalProjects,
      totalTasks,
      statusBreakdown: {
        TODO: todoTasks,
        IN_PROGRESS: inProgressTasks,
        REVIEW: reviewTasks,
        DONE: doneTasks,
      },
      overdueTasks,
      myTasks,
      recentTasks,
      projects: projectStats,
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}
