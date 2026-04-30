"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  FolderKanban,
  ListTodo,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  TrendingUp,
  ArrowRight,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface DashboardData {
  totalProjects: number
  totalTasks: number
  statusBreakdown: { TODO: number; IN_PROGRESS: number; REVIEW: number; DONE: number }
  overdueTasks: number
  myTasks: number
  recentTasks: any[]
  projects: any[]
}

const statusColors: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  REVIEW: "bg-amber-50 text-amber-700 border-amber-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200",
}

const statusIcons: Record<string, any> = {
  TODO: Circle,
  IN_PROGRESS: Loader2,
  REVIEW: Clock,
  DONE: CheckCircle2,
}

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-50 text-blue-600",
  HIGH: "bg-orange-50 text-orange-600",
  URGENT: "bg-red-50 text-red-600",
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard")
      if (res.ok) {
        const d = await res.json()
        setData(d)
      }
    } catch (err) {
      console.error("Failed to fetch dashboard", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) return null

  const completionRate = data.totalTasks > 0 ? Math.round((data.statusBreakdown.DONE / data.totalTasks) * 100) : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your projects and tasks</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/projects")}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Projects</p>
                <p className="text-2xl md:text-3xl font-bold mt-1">{data.totalProjects}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push("/tasks")}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Tasks</p>
                <p className="text-2xl md:text-3xl font-bold mt-1">{data.totalTasks}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center">
                <ListTodo className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">My Tasks</p>
                <p className="text-2xl md:text-3xl font-bold mt-1">{data.myTasks}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`hover:shadow-md transition-shadow ${data.overdueTasks > 0 ? "border-red-200" : ""}`}>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Overdue</p>
                <p className={`text-2xl md:text-3xl font-bold mt-1 ${data.overdueTasks > 0 ? "text-red-600" : ""}`}>
                  {data.overdueTasks}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${data.overdueTasks > 0 ? "bg-red-50" : "bg-muted"}`}>
                <AlertTriangle className={`h-5 w-5 ${data.overdueTasks > 0 ? "text-red-600" : "text-muted-foreground"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Task Status</CardTitle>
            <CardDescription>Current task distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(data.statusBreakdown).map(([status, count]) => {
              const Icon = statusIcons[status]
              const percentage = data.totalTasks > 0 ? Math.round(((count as number) / data.totalTasks) * 100) : 0
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${status === "IN_PROGRESS" ? "animate-spin" : ""}`} />
                      <span className="text-sm font-medium">
                        {status === "TODO" ? "To Do" : status === "IN_PROGRESS" ? "In Progress" : status === "REVIEW" ? "Review" : "Done"}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">{count as number} ({percentage}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completion Rate</span>
                <span className="text-sm font-bold text-emerald-600">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2 mt-2" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Tasks</CardTitle>
              <CardDescription>Latest updated tasks</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push("/tasks")} className="gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListTodo className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No tasks yet. Create your first task!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {data.recentTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/tasks/${task.id}`)}
                  >
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${statusColors[task.status]}`}>
                      {task.status === "TODO" ? "To Do" : task.status === "IN_PROGRESS" ? "In Progress" : task.status === "REVIEW" ? "Review" : "Done"}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.project?.name}</p>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-5 shrink-0 ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </Badge>
                    {task.assignee && (
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {task.assignee.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects overview */}
      {data.projects.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Projects Overview</CardTitle>
              <CardDescription>Your active projects</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => router.push("/projects")} className="gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.projects.map((project: any) => (
                <div
                  key={project.id}
                  className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-sm truncate flex-1">{project.name}</h3>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 ml-2 shrink-0">
                      {project.status}
                    </Badge>
                  </div>
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span className="font-medium">{project.completionRate}%</span>
                    </div>
                    <Progress value={project.completionRate} className="h-1.5" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{project._count.tasks} tasks</span>
                      <span>{project._count.members} members</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
