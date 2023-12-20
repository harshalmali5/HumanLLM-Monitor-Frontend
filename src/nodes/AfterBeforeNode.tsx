import { NodeProps } from "./Props";
import AfterBefore from "./AfterBefore";
import { AfterBeforeData, NodeError } from "./AfterBeforeData";
import { useState } from "react";
import useStore from "./node-store";

const Node = (p: NodeProps) => {
    const { data, id } = p;

    const addNode = useStore((state) => state.addNode);
    const [choice, setChoice] = useState<number>(1);
    const [prompt, setPrompt] = useState<string>("");
    const [error, setError] = useState<NodeError>(NodeError.None);

    const before_after_data = new AfterBeforeData(
        id,
        data,
        choice,
        setChoice,
        prompt,
        setPrompt,
        error,
        setError
    );
    addNode(id, before_after_data);

    const new_props = { ...p, data: before_after_data };

    return <AfterBefore {...new_props} />;
};

export default Node;
