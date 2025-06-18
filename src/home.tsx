import React, { useState } from "react";

export default function Home() {
  const [count, setCount] = useState(1);
  return (
    <div>
      {count}
      <button onClick={() => setCount(count + 1)}>Add</button>
      <button onClick={() => setCount(count - 1)}>Sub</button>
    </div>
  );
}
