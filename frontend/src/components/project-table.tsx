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

import { Input } from "@/components/ui/input";
import { MoreHorizontal } from "lucide-react";
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
      {desc}
      {isTruncated && (
        <span className="ml-1 text-[#c4a5c2] text-xs select-none">
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

  useEffect(() => {
    setLoading(true);
    api
      .get("/project")
      .then((res) => setProjects(res.data))
      .catch(() => setError("Không tải được project"))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const handleDeleteProject = async (projectId: number) => {
    toast(
      (t) => (
        <div>
          <span>Bạn có chắc muốn xoá project này không?</span>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await api.delete(`/project/${projectId}`);
                  toast.success("Đã xoá project thành công");
                  if (onDeleted) onDeleted();
                } catch {
                  toast.error("Xoá thất bại");
                }
              }}
              className="bg-red-500 text-white px-4 py-1.5 rounded-md hover:bg-red-600 transition"
            >
              Xoá
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="border border-gray-400 px-4 py-1.5 rounded-md hover:bg-gray-100 transition"
            >
              Huỷ
            </button>
          </div>
        </div>
      ),
      { duration: 5000, position: "top-center" }
    );
  };

  const filteredProjects = useMemo(() => {
    return [...projects]
      .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
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

  const columns: ColumnDef<Project>[] = [
    {
      header: "STT",
      cell: ({ row }) => <div>{row.index + 1}</div>,
    },

    {
      accessorKey: "name",
      header: "Tên project",
      cell: ({ getValue }) => (
        <div className="truncate max-w-[180px]" title={getValue() as string}>
          {getValue() as string}
        </div>
      ),
    },

    {
      accessorKey: "description",
      header: "Mô tả",
      cell: ({ getValue }) => <DescriptionCell desc={getValue() as string} />,
    },
    {
      accessorKey: "createdAt",
      header: "Ngày tạo",
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return date.toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          hour12: false,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
    {
      accessorKey: "updatedAt",
      header: "Cập nhật",
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return date.toLocaleString("vi-VN", {
          timeZone: "Asia/Ho_Chi_Minh",
          hour12: false,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const project = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-6 w-6 mr-4 hover:bg-[#c4a5c2] rounded-lg cursor-pointer"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedProject(project);
                  setDialogOpen(true);
                }}
                className="cursor-pointer hover:bg-[#c4a5c2] hover:text-white"
              >
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(project.id);
                }}
                className="cursor-pointer hover:bg-[#c4a5c2] hover:text-white"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredProjects,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (loading) return <p className="p-4">Đang tải dữ liệu…</p>;
  if (error) return <p className="text-red-500 p-4">{error}</p>;

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 p-6 pb-2 pt-0 ">
          <Input
            placeholder="Search project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-60"
          />
          <Select
            value={sortType}
            onValueChange={(value) => setSortType(value as any)}
          >
            <SelectTrigger className="w-[125px]">
              <SelectValue placeholder="Sắp xếp theo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Ngày tạo ↓</SelectItem>
              <SelectItem value="oldest">Ngày tạo ↑</SelectItem>
              <SelectItem value="name">Tên A → Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table className="min-w-[900px] table-fixed text-[18px] font-[var(--font-nunito)] ">
          <TableHeader className="bg-white">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header, idx) => (
                  <TableHead
                    key={header.id}
                    className={
                      idx === 0
                        ? "w-[50px] text-center"
                        : idx === 1
                        ? "w-[180px]"
                        : idx === 2
                        ? "w-[320px]"
                        : idx === 3
                        ? "w-[160px]"
                        : idx === 4
                        ? "w-[160px]"
                        : idx === 5
                        ? "w-[90px] text-right"
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
        </Table>

        <div className="h-[310px] overflow-y-auto  mt-[-13px]">
          <Table className="min-w-[900px] table-fixed text-[18px] font-[var(--font-nunito)]  ">
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => {
                      setSelectedProject(row.original);
                      setDialogOpen(true);
                    }}
                    className="cursor-pointer hover:bg-[#cae0ffb5] "
                  >
                    {row.getVisibleCells().map((cell, idx) => (
                      <TableCell
                        key={cell.id}
                        className={
                          idx === 0
                            ? "w-[50px] text-center"
                            : idx === 1
                            ? "w-[180px]"
                            : idx === 2
                            ? "w-[320px]"
                            : idx === 3
                            ? "w-[160px]"
                            : idx === 4
                            ? "w-[160px]"
                            : idx === 5
                            ? "w-[90px] text-right"
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
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center py-4"
                  >
                    Không có project nào
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
    </>
  );
}
