import { NodeProps } from "reactflow";
import InferenceNode from "./InferenceNode";
import useNodeStore from "./node-store";
import { useEffect, useState } from "react";
import { InferenceNodeData, InferenceNodeType } from "./InferenceData";
import { NodeError } from "./error";
import { NodeData, NodeType } from "./NodeData";

const Inference = (p: NodeProps) => {
    const { id, type, selected } = p;
    const addNode = useNodeStore((state) => state.addNode);

    const [error, setError] = useState<NodeError>(NodeError.None);
    const [borderCss, setBorderCss] = useState<string>("");
    const [localSelected, setLocalSelected] = useState<boolean>(false);

    let nodeType;

    switch (type) {
        case "Coder":
            nodeType = InferenceNodeType.Coder;
            break;
        case "Validator":
            nodeType = InferenceNodeType.Validator;
            break;
        case "Coach":
            nodeType = InferenceNodeType.Coach;
            break;
        case "Capitalizer":
            nodeType = InferenceNodeType.Capitalizer;
            break;
        default:
            nodeType = InferenceNodeType.Coder;
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
    const wrapper = new NodeData(id, NodeType.Inference, data, undefined);
    addNode(id, wrapper);

    
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
