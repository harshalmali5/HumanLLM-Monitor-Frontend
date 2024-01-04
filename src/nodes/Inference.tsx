import { NodeProps } from "reactflow";
import InferenceNode from "./InferenceNode";
import useNodeStore from "./node-store";
import { useEffect, useState } from "react";
import { InferenceNodeData, NodeError } from "./InferenceData";
import { NodeType } from "./node-types";

const Inference = (p: NodeProps) => {
    const { id, type, selected } = p;
    const addNode = useNodeStore((state) => state.addNode);

    const [error, setError] = useState<NodeError>(NodeError.None);
    const [borderCss, setBorderCss] = useState<string>("");
    const [localSelected, setLocalSelected] = useState<boolean>(false);

    let nodeType;

    switch (type) {
        case "Coder":
            nodeType = NodeType.Coder;
            break;
        case "Validator":
            nodeType = NodeType.Validator;
            break;
        case "Coach":
            nodeType = NodeType.Coach;
            break;
        case "Capitalizer":
            nodeType = NodeType.Capitalizer;
            break;
        default:
            nodeType = NodeType.Coder;
            break;
    }

    const data = new InferenceNodeData(
        id,
        nodeType,
        error,
        localSelected,
        setError,
        setBorderCss,
        setLocalSelected
    );
    addNode(data.id, data);

    
    useEffect(() => {
        setLocalSelected(selected);
    }, [selected]);

    const props = {
        ...p,
        data,
    };

    return (
        <div className={`w-48 h-48 bg-purple-200 rounded-md ${borderCss}`}>
            <InferenceNode {...props} />
        </div>
    );
};

export default Inference;
