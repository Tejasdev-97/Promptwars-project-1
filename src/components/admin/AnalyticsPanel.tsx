import { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

// Simulate realistic crowd data over a match day (hours since gates open)
const generateMatchDayData = () => {
  const hours = ['10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm', '8pm', '9pm'];
  const base  = [10, 18, 30, 52, 75, 85, 70, 80, 92, 60, 30, 10]; // % crowd
  return hours.map((h, i) => ({
    time:   h,
    crowd:  base[i] + Math.round((Math.random() - 0.5) * 8),
    food:   Math.round(base[i] * 0.4 + Math.random() * 10),
    queues: Math.round(base[i] * 0.35 + Math.random() * 5),
  }));
};

const chartStyle = {
  wrapper: { background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '16px 20px' } as React.CSSProperties,
  title:   { color: '#f9fafb', fontWeight: 800, fontSize: 14, marginBottom: 16 } as React.CSSProperties,
  tooltip: { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8 },
};

export const AnalyticsPanel = () => {
  const [data, setData] = useState(generateMatchDayData());

  // Refresh chart data every 30s to feel "live"
  useEffect(() => {
    const id = setInterval(() => setData(generateMatchDayData()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 16 }}>

      <div style={chartStyle.wrapper}>
        <p style={chartStyle.title}>📊 Stadium Crowd Flow — Match Day</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="crowd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#00d4aa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="time" stroke="#4b5563" fontSize={11} />
            <YAxis stroke="#4b5563" fontSize={11} unit="%" />
            <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: any) => [`${v}%`, 'Crowd']} />
            <Area type="monotone" dataKey="crowd" stroke="#00d4aa" fill="url(#crowd)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={chartStyle.wrapper}>
        <p style={chartStyle.title}>🍔 Food Court & Queue Activity</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="time" stroke="#4b5563" fontSize={11} />
            <YAxis stroke="#4b5563" fontSize={11} />
            <Tooltip contentStyle={chartStyle.tooltip} />
            <Line type="monotone" dataKey="food"   stroke="#f59e0b" strokeWidth={2.5} dot={false} name="Food Stall %" />
            <Line type="monotone" dataKey="queues" stroke="#8b5cf6" strokeWidth={2.5} dot={false} name="Queue Load %" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ ...chartStyle.wrapper, gridColumn: '1 / -1' }}>
        <p style={chartStyle.title}>📈 Hourly Crowd Distribution</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="time" stroke="#4b5563" fontSize={11} />
            <YAxis stroke="#4b5563" fontSize={11} unit="%" />
            <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: any) => [`${v}%`, 'Capacity']} />
            <Bar dataKey="crowd" fill="#00d4aa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
