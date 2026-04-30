import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function getAuthUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null

  const userId = (session.user as any).id
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, avatar: true },
  })

  return user
}

export async function requireAuth() {
  const user = await getAuthUser()
  if (!user) return { error: true, status: 401 }
  return { user, error: false }
}

export async function requireAdmin() {
  const result = await requireAuth()
  if (result.error) return result
  if ((result as any).user.role !== "ADMIN") {
    return { error: true, status: 403 }
  }
  return result
}

export function isProjectAdmin(projectMembers: any[], userId: string): boolean {
  return projectMembers.some(
    (m: any) => m.userId === userId && m.role === "ADMIN"
  )
}
