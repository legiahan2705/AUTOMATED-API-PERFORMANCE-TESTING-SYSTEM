import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

type CheckData = {
  testA: { pass: number; fail: number };
  testB: { pass: number; fail: number };
};

export default function CheckBarChart({ data }: { data: CheckData }) {
  const chartData = [
    {
      name: "Test A",
      Pass: data.testA.pass,
      Fail: data.testA.fail,
    },
    {
      name: "Test B",
      Pass: data.testB.pass,
      Fail: data.testB.fail,
    },
  ];

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barCategoryGap={30}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Pass" fill="#22c55e" name="✅ Pass" />
          <Bar dataKey="Fail" fill="#ef4444" name="❌ Fail" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
