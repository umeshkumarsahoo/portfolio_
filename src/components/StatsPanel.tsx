import { GraduationCap, Briefcase, Cpu, Code2 } from "lucide-react";

export default function StatsPanel() {
  const stats = [
    {
      id: "edu",
      title: "EDUCATION",
      icon: <GraduationCap className="w-5 h-5 text-white" />,
      lines: [
        "B.Tech CSE (4th Year)",
        "Silicon University",
        "CGPA: 9.60 / 10"
      ]
    },
    {
      id: "exp",
      title: "EXPERIENCE",
      icon: <Briefcase className="w-5 h-5 text-white" />,
      lines: [
        "2 Internships",
        "DevOps & MERN Stack",
        "Hands-on Projects"
      ]
    },
    {
      id: "focus",
      title: "FOCUS AREAS",
      icon: <Cpu className="w-5 h-5 text-white" />,
      lines: [
        "AI/ML • NLP • RAG",
        "Data Engineering",
        "MLOps • DevOps"
      ]
    },
    {
      id: "tech",
      title: "TECH STACK",
      icon: <Code2 className="w-5 h-5 text-white" />,
      lines: [
        "Python, ML, DL",
        "React, Node, MongoDB",
        "Terraform, GitHub Actions"
      ]
    }
  ];

  return (
    <div id="stats-panel-container" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-white bg-black select-none shrink-0">
      {stats.map((stat, idx) => (
        <div
          key={stat.id}
          id={`stat-block-${stat.id}`}
          className={`p-3.5 flex flex-col gap-2 justify-center ${
            idx < stats.length - 1 ? "lg:border-r border-dashed border-white/40" : ""
          } ${
            idx % 2 === 0 ? "max-sm:border-b border-dashed border-white/25" : ""
          } ${
            idx < 2 ? "sm:max-lg:border-b border-dashed border-white/30" : ""
          } ${
            idx === 1 ? "sm:border-r-0 lg:border-r" : ""
          }`}
        >
          {/* Section Header with Icon */}
          <div className="flex items-center gap-3">
            <div className="p-1 border border-white/30 rounded bg-white/5 flex items-center justify-center">
              {stat.icon}
            </div>
            <h3 className="font-mono text-sm tracking-widest font-bold text-white uppercase">
              {stat.title}
            </h3>
          </div>

          {/* Lines of text */}
          <div className="font-mono text-xs text-gray-300 space-y-1 pl-1">
            {stat.lines.map((line, lidx) => (
              <p key={lidx} className="tracking-wide">
                {line}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
