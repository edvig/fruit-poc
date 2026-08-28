"use client";

import FruitisimoClosingPOC from "@/components/FruitisimoClosingPOC";
import { useEffect, useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("loading...");

  useEffect(() => {
    fetch("/api/fruit")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("API call failed"));
  }, []);

  return (
    <FruitisimoClosingPOC></FruitisimoClosingPOC>
  );
}
