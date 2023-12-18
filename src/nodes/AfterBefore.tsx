import {
    Handle,
    NodeResizeControl,
    NodeToolbar,
    OnResize,
    Position,
    ResizeDragEvent,
    ResizeParams,
} from "reactflow";
import { AfterBeforeProps } from "./Props";
import NodeCSSClass from "./NodeCSSClass";
import { NodeType } from "./NodeData";
import { useState } from "react";
import useGlobalStore from "../store";
import useStore from "./node-store";
import { shallow } from "zustand/shallow";
import Trash from "../TrashIcon";

const AfterBefore = (p: AfterBeforeProps) => {
    const { data } = p;
    const color = data.type === NodeType.After ? "bg-rose-300" : "bg-red-100";
    const [[w, h], setWH] = useState([256, 256]);
    const globlaNodeDelete = useGlobalStore(
        (state) => state.deleteNode,
        shallow
    );
    const nodeDelete = useStore((state) => state.deleteNode, shallow);

    const handleChoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const choice = e.target.value;
        const choiceInt = parseInt(choice);
        if (!isNaN(choiceInt)) {
            data.changeChoice(choiceInt);
        }
    };

    let prompt = false;
    if (
        data.type === NodeType.After &&
        (data.choice === 1 || data.choice === 2 || data.choice === 5)
    ) {
        prompt = true;
    } else if (
        data.type === NodeType.Before &&
        (data.choice === 1 || data.choice === 2)
    ) {
        prompt = true;
    }

    const updatePrompt = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        data.setPrompt(e.target.value);
    };

    const onResize: OnResize = (_: ResizeDragEvent, param: ResizeParams) => {
        setWH([param.width, param.height]);
    };

    const deleteSelf = () => data.deleteSelf(globlaNodeDelete, nodeDelete);

    return (
        <div
            className={`${NodeCSSClass} ${color} ${
                data.error ? "border-4 border-dotted border-red-500" : ""
            }`}
            style={{ width: w, height: h }}
        >
            <NodeToolbar>
                <Trash onClick={deleteSelf} />
            </NodeToolbar>
            <NodeResizeControl onResize={onResize} />
            <Handle type="target" position={Position.Top} />
            <div className="node-content flex flex-col">
                <select
                    value={data.choice.toString()}
                    onChange={handleChoiceChange}
                    className={color}
                >
                    {data.type === NodeType.After ? (
                        <>
                            <option value="1">Modify Answer</option>
                            <option value="2">Critic Answer</option>
                            <option value="3">Find Better Prompt</option>
                            <option value="4">Eval Answer</option>
                            <option value="5">Skip Human Actions For</option>
                        </>
                    ) : (
                        <>
                            <option value="1">Modify Prompt</option>
                            <option value="2">Add Prompt</option>
                            <option value="3">Skip Inference</option>
                            <option value="4">Log Comment</option>
                            <option value="5">Use Premium LLM</option>
                        </>
                    )}
                </select>
                {prompt ? (
                    <textarea
                        className={`node-prompt ${color}`}
                        value={data.prompt}
                        onChange={updatePrompt}
                        rows={Math.floor(data.prompt.split("\n").length)}
                    />
                ) : (
                    <div className="node-prompt h-12" />
                )}
            </div>
            <Handle type="source" position={Position.Bottom} />
        </div>
    );
};

export default AfterBefore;
