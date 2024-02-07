import { Handle, NodeProps, Position } from "reactflow";
import OptionNode from "./OptionNode";
import { OptionNodeData, OptionNodeType } from "./OptionNodeData";
import { useState } from "react";
import useNodeStore from "./node-store";
import { NodeData, NodeType } from "./NodeData";
import { NodeError, stringifyError } from "./error";

const OptionN = (p: NodeProps) => {
    const { id, type, selected } = p;
    const addNode = useNodeStore((state) => state.addNode);

    let nodeType;

    switch (type) {
        case "Before":
            nodeType = OptionNodeType.Before;
            break;
        case "After":
            nodeType = OptionNodeType.After;
            break;
        default:
            nodeType = OptionNodeType.Before;
            break;
    }

    const [choice, setChoice] = useState<string>("A");
    const [error, setError] = useState<NodeError>(NodeError.None);

    const data = new OptionNodeData(
        id,
        nodeType,
        choice,
        setChoice,
        error,
        setError,
    );
    const wrapper = new NodeData(id, NodeType.Option, undefined, data);
    addNode(data.id, wrapper);

    const props = {
        id,
        type: nodeType,
        selected,
        data,
    };

    return (
        <div className={`w-48 h-48 bg-rose-200 rounded-md`}>
            <Handle type="target" position={Position.Top} />
            <Handle type="source" position={Position.Bottom} />

            <OptionNode {...props} />

            {stringifyError(error)}
        </div>
    );
}

export default OptionN;
