"use client";

import { useState } from "react";
import Header from "@/components/Header";
import { projects } from "@/lib/mock-data";
import type { Project } from "@/lib/mock-data";
import {
  Plus,
  LayoutGrid,
  CalendarDays,
  CheckSquare,
  Square,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Briefcase,
  MoreHorizontal,
  Pencil,
  ArrowRight,
  Flag,
  BarChart2,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function daysRemaining(endDate: string) {
  const end = new Date(endDate);
  const now = new Date("2026-04-25");
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function statusLabel(status: Project["status"]) {
  switch (status) {
    case "active": return "פעיל";
    case "planning": return "תכנון";
    case "completed": return "הושלם";
    case "on_hold": return "בהמתנה";
  }
}

function statusColor(status: Project["status"]) {
  switch (status) {
    case "active": return { badge: "bg-blue-100 text-blue-700", bar: "bg-blue-500", glow: "shadow-blue-100" };
    case "planning": return { badge: "bg-amber-100 text-amber-700", bar: "bg-amber-400", glow: "shadow-amber-100" };
    case "completed": return { badge: "bg-green-100 text-green-700", bar: "bg-green-500", glow: "shadow-green-100" };
    case "on_hold": return { badge: "bg-gray-100 text-gray-600", bar: "bg-gray-400", glow: "shadow-gray-100" };
  }
}

function budgetPercent(spent: number, budget: number) {
  return Math.min((spent / budget) * 100, 100);
}

function budgetBarColor(spent: number, budget: number) {
  const pct = spent / budget;
  if (pct >= 1) return "bg-red-500";
  if (pct >= 0.8) return "bg-amber-400";
  return "bg-green-500";
}

// ─────────────────────────────────────────────────────────────
// Stats bar
// ─────────────────────────────────────────────────────────────

function StatsBar() {
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const activeCount = projects.filter((p) => p.status === "active").length;
  const expectedProfit = totalBudget - totalSpent;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'סה"כ פרויקטים', value: projects.length.toString(), icon: <Briefcase size={18} />, color: "text-violet-600", bg: "bg-violet-50" },
        { label: "פעיל", value: activeCount.toString(), icon: <TrendingUp size={18} />, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "תקציב כולל", value: `₪${totalBudget.toLocaleString("he-IL")}`, icon: <DollarSign size={18} />, color: "text-green-600", bg: "bg-green-50" },
        { label: "רווח צפוי", value: `₪${expectedProfit.toLocaleString("he-IL")}`, icon: <BarChart2 size={18} />, color: "text-amber-600", bg: "bg-amber-50" },
      ].map((s) => (
        <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${s.bg} ${s.color} flex items-center justify-center flex-shrink-0`}>
            {s.icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Project Card (Card view)
// ─────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const [checkedTasks, setCheckedTasks] = useState<Set<number>>(
    new Set(Array.from({ length: project.tasks.length }, (_, i) => i).filter((i) => i < Math.floor(project.progress / (100 / project.tasks.length))))
  );

  const colors = statusColor(project.status);
  const days = daysRemaining(project.endDate);
  const budgetPct = budgetPercent(project.spent, project.budget);
  const bColor = budgetBarColor(project.spent, project.budget);
  const isOverBudget = project.spent > project.budget;

  const toggleTask = (i: number) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-lg transition-all shadow-sm ${colors.glow}`} dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 ml-2">
          <h3 className="font-bold text-gray-800 text-base leading-tight mb-1 truncate">{project.name}</h3>
          <p className="text-xs text-gray-500">{project.customerName}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
            {statusLabel(project.status)}
          </span>
          <button className="text-gray-300 hover:text-gray-500">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-600">התקדמות</span>
          <span className="text-xs font-bold text-gray-800">{project.progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${colors.bar}`}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* Budget */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-600">תקציב</span>
          <div className="flex items-center gap-1">
            {isOverBudget && <AlertTriangle size={12} className="text-red-500" />}
            <span className={`text-xs font-semibold ${isOverBudget ? "text-red-600" : "text-gray-700"}`}>
              ₪{project.spent.toLocaleString("he-IL")} / ₪{project.budget.toLocaleString("he-IL")}
            </span>
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${bColor}`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>
        {isOverBudget && (
          <p className="text-xs text-red-500 mt-1 font-medium">חריגה בתקציב!</p>
        )}
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
        <CalendarDays size={13} className="text-gray-400" />
        <span>{formatDate(project.startDate)}</span>
        <ArrowRight size={11} className="text-gray-300 rotate-180" />
        <span>{formatDate(project.endDate)}</span>
        <span className={`mr-auto font-semibold ${days < 7 ? "text-red-500" : days < 14 ? "text-amber-500" : "text-green-600"}`}>
          {days > 0 ? `${days} ימים נותרו` : days === 0 ? "היום!" : `איחור ${Math.abs(days)} ימים`}
        </span>
      </div>

      {/* Tasks */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 mb-2">משימות ({checkedTasks.size}/{project.tasks.length})</p>
        <div className="space-y-1.5">
          {project.tasks.map((task, i) => (
            <button
              key={i}
              onClick={() => toggleTask(i)}
              className="flex items-center gap-2 w-full text-right group"
            >
              {checkedTasks.has(i) ? (
                <CheckSquare size={14} className="text-green-500 flex-shrink-0" />
              ) : (
                <Square size={14} className="text-gray-300 flex-shrink-0 group-hover:text-gray-400" />
              )}
              <span className={`text-xs ${checkedTasks.has(i) ? "line-through text-gray-400" : "text-gray-600"}`}>
                {task}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${colors.bar} text-white hover:opacity-90`}>
          ניהול פרויקט
        </button>
        <button className="flex-1 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-1">
          <Pencil size={12} />
          עדכן התקדמות
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Kanban Board
// ─────────────────────────────────────────────────────────────

const kanbanColumns: { key: Project["status"]; label: string; color: string; headerColor: string }[] = [
  { key: "planning", label: "תכנון", color: "bg-amber-50 border-amber-200", headerColor: "bg-amber-400" },
  { key: "active", label: "פעיל", color: "bg-blue-50 border-blue-200", headerColor: "bg-blue-500" },
  { key: "on_hold", label: "בהמתנה", color: "bg-gray-50 border-gray-200", headerColor: "bg-gray-400" },
  { key: "completed", label: "הושלם", color: "bg-green-50 border-green-200", headerColor: "bg-green-500" },
];

function KanbanBoard() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
      {kanbanColumns.map((col) => {
        const colProjects = projects.filter((p) => p.status === col.key);
        return (
          <div key={col.key} className={`rounded-2xl border ${col.color} overflow-hidden`}>
            {/* Column header */}
            <div className={`${col.headerColor} px-4 py-3 flex items-center justify-between`}>
              <span className="text-white font-semibold text-sm">{col.label}</span>
              <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {colProjects.length}
              </span>
            </div>
            {/* Cards */}
            <div className="p-3 space-y-3 min-h-[120px]">
              {colProjects.length === 0 && (
                <div className="text-center py-6 text-xs text-gray-400">אין פרויקטים</div>
              )}
              {colProjects.map((project) => (
                <div key={project.id} className="bg-white rounded-xl p-3 shadow-sm border border-white hover:shadow-md transition-shadow cursor-pointer">
                  <p className="font-semibold text-gray-800 text-sm mb-1 truncate">{project.name}</p>
                  <p className="text-xs text-gray-500 mb-2">{project.customerName}</p>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${statusColor(project.status).bar}`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">{project.progress}%</span>
                    <span className="text-xs text-gray-400">{formatDate(project.endDate)}</span>
                  </div>
                </div>
              ))}
              <button className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 border border-dashed border-gray-200 rounded-xl hover:border-gray-300 transition-colors flex items-center justify-center gap-1">
                <Plus size={12} /> הוסף פרויקט
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Gantt Timeline
// ─────────────────────────────────────────────────────────────

function GanttTimeline() {
  const timelineStart = new Date("2026-03-01");
  const timelineEnd = new Date("2026-07-01");
  const totalDays = Math.ceil((timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));

  function getBarStyle(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startOffset = Math.max(0, (start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return {
      right: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  }

  const months = ["מרץ", "אפריל", "מאי", "יוני", "יולי"];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" dir="rtl">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
        <CalendarDays size={18} className="text-gray-600" />
        <h3 className="font-semibold text-gray-800">ציר זמן פרויקטים</h3>
        <span className="text-xs text-gray-400 mr-auto">מרץ — יולי 2026</span>
      </div>

      <div className="px-6 py-4">
        {/* Month labels */}
        <div className="flex mb-4 mr-40 relative">
          {months.map((m) => (
            <div key={m} className="flex-1 text-xs text-gray-400 font-medium text-center">{m}</div>
          ))}
        </div>

        {/* Month dividers */}
        <div className="space-y-3">
          {projects.map((project) => {
            const colors = statusColor(project.status);
            const days = daysRemaining(project.endDate);
            return (
              <div key={project.id} className="flex items-center gap-4">
                {/* Label */}
                <div className="w-40 flex-shrink-0 text-right">
                  <p className="text-sm font-medium text-gray-700 truncate">{project.name.split("—")[0].trim()}</p>
                  <p className="text-xs text-gray-400">{project.customerName}</p>
                </div>
                {/* Bar area */}
                <div className="flex-1 relative h-8 bg-gray-50 rounded-xl overflow-hidden">
                  {/* Grid lines */}
                  {[0, 20, 40, 60, 80, 100].map((pct) => (
                    <div key={pct} className="absolute top-0 bottom-0 w-px bg-gray-200" style={{ right: `${pct}%` }} />
                  ))}
                  {/* Today line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                    style={{
                      right: `${((new Date("2026-04-25").getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100}%`,
                    }}
                  />
                  {/* Project bar */}
                  <div
                    className={`absolute top-1.5 bottom-1.5 rounded-lg ${colors.bar} opacity-80 flex items-center px-2 z-5`}
                    style={getBarStyle(project.startDate, project.endDate)}
                  >
                    <span className="text-white text-xs font-semibold truncate">{project.progress}%</span>
                  </div>
                  {/* Progress overlay */}
                  <div
                    className={`absolute top-1.5 bottom-1.5 rounded-lg ${colors.bar} flex items-center px-2`}
                    style={{
                      ...getBarStyle(project.startDate, project.endDate),
                      width: `${((project.progress / 100) * (parseFloat(getBarStyle(project.startDate, project.endDate).width)))}`,
                      opacity: 1,
                    }}
                  />
                </div>
                {/* Days badge */}
                <div className="w-24 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${days < 7 ? "bg-red-100 text-red-600" : days < 14 ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}>
                    {days > 0 ? `${days} ימים` : days === 0 ? "היום" : `${Math.abs(days)}d איחור`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-3 h-0.5 bg-red-400"></div>
            היום
          </div>
          {kanbanColumns.map((c) => (
            <div key={c.key} className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className={`w-3 h-3 rounded-sm ${c.headerColor}`}></div>
              {c.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Budget Tracker
// ─────────────────────────────────────────────────────────────

function BudgetTracker() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" dir="rtl">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
        <DollarSign size={18} className="text-gray-600" />
        <h3 className="font-semibold text-gray-800">מעקב תקציב</h3>
      </div>
      <div className="p-6 space-y-5">
        {projects.map((project) => {
          const pct = budgetPercent(project.spent, project.budget);
          const bColor = budgetBarColor(project.spent, project.budget);
          const isOver = project.spent > project.budget;
          const remaining = project.budget - project.spent;
          const expectedTotal = project.spent / (project.progress / 100);
          const colors = statusColor(project.status);

          return (
            <div key={project.id}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.bar}`}></span>
                  <span className="font-medium text-gray-800 text-sm">{project.name.split("—")[0].trim()}</span>
                  {isOver && (
                    <span className="flex items-center gap-1 text-xs text-red-500 font-semibold">
                      <AlertTriangle size={11} /> חריגה
                    </span>
                  )}
                </div>
                <div className="text-left text-xs text-gray-500 space-x-1 space-x-reverse">
                  <span className="font-semibold text-gray-800">₪{project.spent.toLocaleString("he-IL")}</span>
                  <span>/</span>
                  <span>₪{project.budget.toLocaleString("he-IL")}</span>
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${bColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{Math.round(pct)}% נוצל</span>
                <div className="flex items-center gap-3">
                  {!isOver && (
                    <span className="text-green-600 font-medium">נותר: ₪{remaining.toLocaleString("he-IL")}</span>
                  )}
                  {project.progress > 0 && project.progress < 100 && (
                    <span className="text-gray-500">
                      עלות צפויה: ₪{Math.round(expectedTotal).toLocaleString("he-IL")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Summary */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">סה"כ הוצאות</span>
            <span className="text-sm font-bold text-gray-900">
              ₪{projects.reduce((s, p) => s + p.spent, 0).toLocaleString("he-IL")} / ₪{projects.reduce((s, p) => s + p.budget, 0).toLocaleString("he-IL")}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500"
              style={{
                width: `${(projects.reduce((s, p) => s + p.spent, 0) / projects.reduce((s, p) => s + p.budget, 0)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

type ViewMode = "cards" | "kanban";

export default function ProjectsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Header title="פרויקטים" subtitle="נהל את כל הפרויקטים, תקציבים וציר הזמן" />

      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">פרויקטים</h1>
            <p className="text-gray-500 text-sm mt-0.5">נהל את כל הפרויקטים, תקציבים וציר הזמן</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode("cards")}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${viewMode === "cards" ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:bg-gray-50"}`}
              >
                <LayoutGrid size={15} />
                כרטיסים
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors ${viewMode === "kanban" ? "bg-gray-100 text-gray-800" : "text-gray-500 hover:bg-gray-50"}`}
              >
                <LayoutGrid size={15} />
                קנבן
              </button>
            </div>
            <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:from-green-600 hover:to-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-green-200">
              <Plus size={16} />
              פרויקט חדש +
            </button>
          </div>
        </div>

        {/* Stats */}
        <StatsBar />

        {/* Cards / Kanban view */}
        {viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="mb-6">
            <KanbanBoard />
          </div>
        )}

        {/* Timeline */}
        <div className="mb-6">
          <GanttTimeline />
        </div>

        {/* Budget tracker */}
        <BudgetTracker />
      </div>
    </div>
  );
}
