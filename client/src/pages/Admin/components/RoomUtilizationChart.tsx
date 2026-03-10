import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from "recharts";

interface RoomUtilizationChartProps {
  data: any[];
}

const RoomUtilizationChart = ({ data }: RoomUtilizationChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={350} minWidth={0} minHeight={0}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
        <XAxis 
          dataKey="room_id" 
          tick={{ fill: 'currentColor', fontSize: 10 }} 
          axisLine={{ stroke: 'hsl(var(--primary) / 0.2)' }}
          tickLine={false}
        />
        <YAxis 
          tick={{ fill: 'currentColor', fontSize: 10 }} 
          axisLine={{ stroke: 'hsl(var(--primary) / 0.2)' }}
          tickLine={false}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(var(--background))', 
            borderColor: 'hsl(var(--border))',
            fontFamily: 'inherit',
            fontSize: '12px'
          }} 
          cursor={{ fill: 'hsl(var(--primary) / 0.05)' }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }}
        />
        <Bar 
          dataKey="totalBookings" 
          name="Total Bookings" 
          fill="hsl(var(--primary))" 
          radius={[4, 4, 0, 0]} 
        />
        <Bar 
          dataKey="totalHours" 
          name="Total Hours" 
          fill="hsl(var(--secondary))" 
          radius={[4, 4, 0, 0]} 
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default RoomUtilizationChart;
