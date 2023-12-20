import { InferenceProps } from "./Props";
import NodeCSSClass from "./NodeCSSClass";
import { Handle, NodeToolbar, Position } from "reactflow";
import useGlobalStore from "../store";
import Trash from "../TrashIcon";

const InferenceNode = (p: InferenceProps) => {
    const { id, type } = p;
    const deleteNode = useGlobalStore((state) => state.deleteNode);

    const deleteSelf = () => deleteNode(id);

    return (
        <div className={`${NodeCSSClass} w-48 h-48 bg-purple-200`}>
            <NodeToolbar>
                <Trash onClick={deleteSelf} />
            </NodeToolbar>
            <h1 className="text-2xl text-center">Inference</h1>
            <Handle type="target" position={Position.Top} />
            <h2 className="text-xl text-center">{type}</h2>
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

export default InferenceNode;
