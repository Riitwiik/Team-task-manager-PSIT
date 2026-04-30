"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  FolderKanban,
  Plus,
  Loader2,
  Search,
  MoreHorizontal,
  Trash2,
  Archive,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCurrentUser } from "@/hooks/use-session"
import { toast } from "sonner"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const { user: currentUser } = useCurrentUser()
  const router = useRouter()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  useEffect(() => {
    Promise.all([fetchProjects(), fetchUsers()])
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects")
      if (res.ok) {
        const data = await res.json()
        setProjects(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users")
      if (res.ok) {
        setUsers(await res.json())
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setFormLoading(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          memberIds: selectedMembers,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to create project")
        return
      }

      toast.success("Project created successfully")
      setDialogOpen(false)
      setName("")
      setDescription("")
      setSelectedMembers([])
      fetchProjects()
    } catch (err) {
      toast.error("Failed to create project")
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project? This will also delete all associated tasks.")) return
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Project deleted")
        fetchProjects()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete project")
      }
    } catch (err) {
      toast.error("Failed to delete project")
    }
  }

  const handleArchive = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ARCHIVED" ? "ACTIVE" : "ARCHIVED"
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast.success(newStatus === "ARCHIVED" ? "Project archived" : "Project restored")
        fetchProjects()
      }
    } catch (err) {
      toast.error("Failed to update project")
    }
  }

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your projects and teams</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>Add a new project and invite team members</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Website Redesign"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the project..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Team Members</Label>
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {users
                    .filter((u) => u.id !== currentUser?.id)
                    .map((u) => (
                      <label
                        key={u.id}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedMembers.includes(u.id) ? "bg-primary/5" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(u.id)}
                          onChange={() => toggleMember(u.id)}
                          className="rounded"
                        />
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {u.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{u.name}</span>
                        <Badge variant="secondary" className="text-[10px] ml-auto">
                          {u.role === "ADMIN" ? "Admin" : "Member"}
                        </Badge>
                      </label>
                    ))}
                  {users.filter((u) => u.id !== currentUser?.id).length === 0 && (
                    <p className="text-sm text-muted-foreground p-3 text-center">No other users available</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading || !name.trim()}>
                  {formLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Project
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-1">No projects found</h3>
          <p className="text-muted-foreground mb-4">
            {search ? "Try a different search term" : "Create your first project to get started"}
          </p>
          {!search && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const doneTasks = project.tasks?.filter((t: any) => t.status === "DONE").length || 0
            const totalTasks = project._count?.tasks || project.tasks?.length || 0
            const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0
            const canManage = currentUser?.role === "ADMIN" || project.createdBy?.id === currentUser?.id

            return (
              <Card
                key={project.id}
                className="hover:shadow-md transition-all cursor-pointer group"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 mt-1">
                        {project.description || "No description"}
                      </CardDescription>
                    </div>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem onClick={() => handleArchive(project.id, project.status)}>
                            <Archive className="h-4 w-4 mr-2" />
                            {project.status === "ARCHIVED" ? "Restore" : "Archive"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(project.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 h-5 ${
                        project.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : project.status === "ARCHIVED"
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span className="font-medium">{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} className="h-1.5" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {project.members?.length || 0} members
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {totalTasks} tasks
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
