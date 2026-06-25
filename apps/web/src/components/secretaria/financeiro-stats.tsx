"use client";

import { DollarSign, CheckCircle, AlertCircle, Clock } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type Props = {
  total: number;
  pagas: number;
  vencidas: number;
  pendentes: number;
  valorTotalCents: number;
  valorRecebidoCents: number;
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const STATUS_COLORS = {
  Pagas: "#14b8a6",
  Pendentes: "#f59e0b",
  Vencidas: "#ef4444",
};
const RECEITA_COLORS = { Realizada: "#14b8a6", "Em aberto": "#e2e8f0" };

export function FinanceiroStats({
  total,
  pagas,
  vencidas,
  pendentes,
  valorTotalCents,
  valorRecebidoCents,
}: Props) {
  const cards = [
    {
      label: "Total emitido",
      value: formatBRL(valorTotalCents),
      sub: `${total} mensalidades`,
      icon: DollarSign,
      color: "text-navy-600",
      bg: "bg-navy-50",
    },
    {
      label: "Recebido",
      value: formatBRL(valorRecebidoCents),
      sub: `${pagas} pagas`,
      icon: CheckCircle,
      color: "text-teal-600",
      bg: "bg-teal-50",
    },
    {
      label: "Vencidas",
      value: String(vencidas),
      sub: "aguardando regularização",
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "Pendentes",
      value: String(pendentes),
      sub: "a vencer",
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  const statusData = [
    { name: "Pagas", value: pagas },
    { name: "Pendentes", value: pendentes },
    { name: "Vencidas", value: vencidas },
  ].filter((d) => d.value > 0);

  const receitaAberto = Math.max(0, valorTotalCents - valorRecebidoCents);
  const receitaData = [
    { name: "Realizada", value: valorRecebidoCents },
    { name: "Em aberto", value: receitaAberto },
  ].filter((d) => d.value > 0);

  const hasData = total > 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-lg border border-navy-100 bg-white p-4 flex items-center gap-3"
          >
            <div className={`rounded-full p-2 ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-navy-900">{value}</p>
              <p className="text-xs font-medium text-navy-700">{label}</p>
              <p className="text-xs text-navy-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status distribution */}
          <div className="rounded-lg border border-navy-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-navy-700 mb-3">
              Mensalidades por status
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => [`${v as number} mensalidades`, ""]}
                />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Receita realizada vs projetada */}
          <div className="rounded-lg border border-navy-100 bg-white p-4">
            <h3 className="text-sm font-semibold text-navy-700 mb-3">
              Receita: realizada vs. projetada
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={receitaData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {receitaData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        RECEITA_COLORS[
                          entry.name as keyof typeof RECEITA_COLORS
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [formatBRL(v as number), ""]} />
                <Legend iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
