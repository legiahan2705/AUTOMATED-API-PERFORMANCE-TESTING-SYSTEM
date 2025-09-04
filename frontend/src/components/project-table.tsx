"use client";

import ProjectDetails from "./ProjectDetailsDialog";
import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MoreHorizontal,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  FolderOpen,
  Eye,
  Trash2,
  Calendar,
  Clock,
} from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { fetchProjectById } from "@/lib/api";

// Props
interface ProjectTableProps {
  refreshTrigger: number;
  onDeleted?: () => void;
}

// Kiểu project
export interface Project {
  id: number;
  name: string;
  description?: string;
  apiUrl?: string;
  vus?: string;
  duration?: string;
  postmanFilePath?: string;
  k6ScriptFilePath?: string;
  originalPostmanFileName?: string;
  originalK6ScriptFileName?: string;
  createdAt: string;
  updatedAt: string;
  method?: string;
  headers?: string;
  body?: string;
  gptAnalysis?: string;
}

// Mô tả cắt gọn
function DescriptionCell({ desc }: { desc: string }) {
  const descRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (descRef.current) {
      const el = descRef.current;
      setIsTruncated(el.scrollWidth > el.clientWidth);
    }
  }, [desc]);

  return (
    <div
      ref={descRef}
      className={
        expanded
          ? "max-w-[320px] whitespace-pre-line break-words"
          : "max-w-[320px] truncate"
      }
      title={!expanded && isTruncated ? desc : ""}
      style={{ cursor: isTruncated ? "pointer" : "default" }}
      onClick={(e) => {
        e.stopPropagation();
        if (isTruncated) setExpanded((v) => !v);
      }}
    >
      {desc || <span className="text-muted-foreground italic">No description</span>}
      {isTruncated && (
        <span className="ml-1 text-primary text-xs select-none">
          {expanded ? "▲" : "▼"}
        </span>
      )}
    </div>
  );
}

// Component chính
export function ProjectTable({ refreshTrigger, onDeleted }: ProjectTableProps) {
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sortType, setSortType] = useState<"oldest" | "newest" | "name">(
    "newest"
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const searchRef = useRef<number | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/project");
      setProjects(res.data);
    } catch (e: any) {
      setError("Không tải được project");
      console.error("Fetch projects error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [refreshTrigger]);

  const handleDeleteProject = async (projectId: number) => {
    try {
      await api.delete(`/project/${projectId}`);
      toast.success("Đã xoá project thành công");
      if (onDeleted) onDeleted();
    } catch {
      toast.error("Xoá thất bại");
    }
  };

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...projects]
      .filter((p) => 
        !q || 
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        String(p.id).includes(q)
      )
      .sort((a, b) => {
        if (sortType === "oldest")
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        if (sortType === "newest")
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        if (sortType === "name") return a.name.localeCompare(b.name);
        return 0;
      });
  }, [projects, search, sortType]);

  const onSearchChange = (v: string) => {
    setSearch(v);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = window.setTimeout(() => {}, 250);
  };

  const columns: ColumnDef<Project>[] = [
    {
      header: "#",
      cell: ({ row }) => (
        <div className="text-center font-mono text-muted-foreground text-[18px]">
          {row.index + 1}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: "Project Name",
      cell: ({ getValue }) => (
        <div className=" truncate max-w-[180px] text-[18px]" title={getValue() as string}>
          {getValue() as string}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ getValue }) =>
        <DescriptionCell  desc={getValue() as string} />,
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return (
          <div className="text-sm text-[18px]">
            <div >
              {date.toLocaleDateString('vi-VN')}
            </div>
            <div className="text-muted-foreground ">
              {date.toLocaleTimeString('vi-VN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return (
          <div className="text-sm text-[18px]">
            <div >
              {date.toLocaleDateString('vi-VN')}
            </div>
            <div className="text-muted-foreground">
              {date.toLocaleTimeString('vi-VN', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex items-center gap-2 justify-center text-[18px] ">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedProject(project);
                setDialogOpen(true);
              }}
              size="sm"
              variant="outline"
              className="hover:bg-[#658ec7] hover:text-primary-foreground cursor-pointer"
            >
              <Eye className="w-3 h-3 " />
              
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  onClick={(e) => e.stopPropagation()}
                  size="sm"
                  variant="outline"
                  className="hover:bg-destructive hover:text-primary-foreground cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Project</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete project "{project.name}"? 
                    This action cannot be undone and will permanently remove 
                    the project and all its associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProject(project.id);
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredProjects,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="border-0 p-0 m-0">
      <div className="container mx-auto max-w-7xl border-0 p-0 m-0">
        <Card className="bg-gradient-card overflow-hidden border-0 m-0 p-0 rounded-t-lg">
          {/* Header */}
          <CardHeader className="bg-[#658ec7] text-white p-6 font-[var(--font-nunito)] border-0 rounded-t-lg">
            <div className="flex items-center justify-between border-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-[25px] font-[var(--font-nunito)] font-bold">Projects</h2>
                  <p className="text-white/80 font-lora text-[18px] ">
                    Manage and organize your test projects
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={fetchProjects}
                disabled={loading}
                className="bg-white/20 hover:bg-white/30 text-white border-white/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent className="pb-6">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8 p-0">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground " />
                  <Input
                    placeholder="Search projects by name, description, or ID..."
                    className="pl-10 md:w-[320px] bg-background/50 border-border/50 focus:bg-background placeholder:text-[15px] text-[15px]"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Select
                    value={sortType}
                    onValueChange={(value) => setSortType(value as any)}
                  >
                    <SelectTrigger className="w-[180px] pl-10 bg-background/50 border-border/50 cursor-pointer text-[15px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest" className="cursor-pointer">Newest First</SelectItem>
                      <SelectItem value="oldest" className="cursor-pointer">Oldest First</SelectItem>
                      <SelectItem value="name" className="cursor-pointer">Name A → Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FolderOpen className="w-4 h-4" />
                  <span >{projects.length} Projects</span>
                </div>
                {search && (
                  <>
                    <div className="w-px h-4 bg-border" />
                    <div className="flex items-center gap-1">
                      <span>{filteredProjects.length} Filtered</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Table Container */}
            <div className="shadow-soft overflow-hidden border-0 p-0">
              <div className="overflow-auto max-h-[350px] scrollbar-thin scrollbar-track-transparent scrollbar-clear">
                <Table>
                  <TableHeader className="sticky top-0">
                    {table.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((header, idx) => (
                          <TableHead
                            key={header.id}
                            className={
                              idx === 0
                                ? "w-[60px] text-center font-semibold text-[#658ec7] text-[18px]"
                                : idx === 1
                                ? "w-[200px] font-semibold text-[#658ec7] text-[18px]"
                                : idx === 2
                                ? "w-[300px] font-semibold text-[#658ec7] text-[18px]"
                                : idx === 3
                                ? "w-[160px] font-semibold text-[#658ec7] text-[18px]"
                                : idx === 4
                                ? "w-[160px] font-semibold text-[#658ec7] text-[18px]"
                                : idx === 5
                                ? "w-[140px] text-center font-semibold text-[#658ec7] text-[18px]"
                                : ""
                            }
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">
                              Loading projects...
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                              <AlertCircle className="w-6 h-6 text-destructive" />
                            </div>
                            <div>
                              <p className="text-destructive font-medium">
                                Error Loading Data
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {error}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={fetchProjects}
                            >
                              Try Again
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredProjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                              <FolderOpen className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">
                                No projects found
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {search
                                  ? "Try adjusting your search criteria"
                                  : "Create your first project to get started"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          onClick={() => {
                            setSelectedProject(row.original);
                            setDialogOpen(true);
                          }}
                          className="cursor-pointer hover:bg-[#cae0ffb5] transition-colors"
                        >
                          {row.getVisibleCells().map((cell, idx) => (
                            <TableCell
                              key={cell.id}
                              className={
                                idx === 0
                                  ? "w-[60px] text-center "
                                  : idx === 1
                                  ? "w-[200px]"
                                  : idx === 2
                                  ? "w-[300px] text-[18px]"
                                  : idx === 3
                                  ? "w-[160px] "
                                  : idx === 4
                                  ? "w-[160px]"
                                  : idx === 5
                                  ? "w-[140px] text-center"
                                  : ""
                              }
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Footer Stats */}
            {projects.length > 0 && (
              <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="text-[#658ec7]">
                    Showing {filteredProjects.length} of {projects.length} projects
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-[#658ec7]">Last updated: {new Date().toLocaleTimeString('vi-VN')}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedProject && (
        <ProjectDetails
          open={dialogOpen}
          project={selectedProject}
          onClose={() => {
            setDialogOpen(false);
            setSelectedProject(null);
          }}
          onUpdated={async () => {
            const all = await api.get("/project");
            setProjects(all.data);
          }}
        />
      )}
    </div>
  );
}