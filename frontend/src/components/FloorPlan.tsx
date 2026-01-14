type Room = {
  id: number;
  room_number: string;
  status: string;
};

type FloorPlanProps = {
  rooms: Room[];
};

const FloorPlan = ({ rooms }: FloorPlanProps) => {
  // Use real room data from database
  const displayRooms = rooms.slice(0, 8); // Show up to 8 rooms
  
  if (displayRooms.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-white p-8 shadow-md text-center text-slate-600">
        <p>No rooms to display</p>
      </div>
    );
  }

  const cols = Math.ceil(Math.sqrt(displayRooms.length));
  const rows = Math.ceil(displayRooms.length / cols);
  const viewBoxWidth = cols * 100 + 40;
  const viewBoxHeight = rows * 120 + 80;

  return (
    <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full rounded-2xl bg-white p-4 shadow-md">
      {displayRooms.map((room, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = 20 + col * 100;
        const y = 40 + row * 120;
        const color = room.status === "occupied" ? "#EF4444" : "#10B981";
        return (
          <g key={room.id}>
            <rect x={x} y={y} width="80" height="100" fill={color} rx="12" opacity={0.7} />
            <text x={x + 40} y={y + 50} textAnchor="middle" fontSize="16" fill="#0F172A" fontWeight="bold">
              {room.room_number}
            </text>
            <text x={x + 40} y={y + 70} textAnchor="middle" fontSize="12" fill="#0F172A" opacity={0.7}>
              {room.status}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export default FloorPlan;

