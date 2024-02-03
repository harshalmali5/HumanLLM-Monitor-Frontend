import NodeCSSClass from "./NodeCSSClass";
import { Handle, NodeToolbar, Position } from "reactflow";
import useGlobalStore from "../store";
import Trash from "../TrashIcon";
import { InferenceNodeData } from "./InferenceData";
import { stringifyError } from "./error";


interface InferenceNodeProps {
    id: string;
    type: string;
    selected: boolean;
    data: InferenceNodeData;
}

const InferenceNode = (p: InferenceNodeProps) => {
    const { id, type, data } = p;
    const deleteNode = useGlobalStore((state) => state.deleteNode);

    const deleteSelf = () => deleteNode(id);

    let error = stringifyError(data.error);

    return (
        <div
            className={`${NodeCSSClass} w-48 h-48 bg-purple-200 ${data.error ? "border-4 border-red-500" : ""
                }`}
        >
            <NodeToolbar>
                <Trash onClick={deleteSelf} />
            </NodeToolbar>
            <h1 className="text-2xl text-center">Inference</h1>
            <Handle type="target" position={Position.Top} />
            <h2 className="text-xl text-center">{type}</h2>

            <pre className="text-xs text-center">
                {data.id}
                <br />
                {error}
            </pre>

            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

export default InferenceNode;
