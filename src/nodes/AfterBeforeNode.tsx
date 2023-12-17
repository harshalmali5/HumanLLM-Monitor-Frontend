import { NodeProps } from "./Props";
import AfterBefore from "./AfterBefore";
import { AfterBeforeData } from "./AfterBeforeData";
import { useState } from "react";

const Node = (p: NodeProps) => {
  const { data, id } = p;

  const [choice, setChoice] = useState<number>(1);
  const [prompt, setPrompt] = useState<string>("");

  const before_after_data = new AfterBeforeData(
    id,
    data,
    choice,
    setChoice,
    prompt,
    setPrompt
  );

  const new_props = { ...p, data: before_after_data };

  return <AfterBefore {...new_props} />;
};

export default Node;
