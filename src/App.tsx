import ReactFlow, { Controls, Background, MiniMap, Panel } from "reactflow";

import { nanoid } from "nanoid";
import { shallow } from "zustand/shallow";
import useStore, { RFState } from "./store";
import { useCallback, useEffect, useRef, useState } from "react";
import AfterBeforeNode from "./nodes/AfterBeforeNode";
import { NodeType } from "./nodes/NodeData";
import InferenceNode from "./nodes/InferenceNode";
import useNodeStore from "./nodes/node-store";

import "reactflow/dist/style.css";
import { NodeError } from "./nodes/AfterBeforeData";

const selector = (state: RFState) => ({
    nodes: state.nodes,
    edges: state.edges,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    addNode: state.addNode,
});

const nodeTypes = {
    AfterBeforeNode: AfterBeforeNode,
    InferenceNode: InferenceNode,
};

const nodeKeys = Object.keys(nodeTypes);

const randint = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

interface ExecOutputProps {
    output: string[];
    needsInput: boolean;
    inputLabel?: string;
    input: (_: string) => void;
}

function ExecOutput({
    output,
    needsInput,
    input,
    inputLabel,
}: ExecOutputProps) {
    const [processedOutput, setProcessedOutput] = useState<string[][]>([]);
    const [parsedTill, setParsedTill] = useState(0);
    const regex = /LLM ANSWER:\n((?:.|\n)*)\n\*{5}/g;

    useEffect(() => {
        console.log("output changed");
        console.log(output);
        const match = regex.exec(output.slice(parsedTill).join("\n"));
        if (!match) {
            return;
        }
        const [_, ...answers] = match;
        setProcessedOutput(p => [...p, answers[0].split("\n")]);
        setParsedTill(output.length);
    }, [output]);

    return (
        <>
            <div className="flex flex-col space-y-2">
                {processedOutput.map((answer, i) => (
                    <div key={i} className="flex flex-col space-y-2">
                        <div className="font-bold">Answer {i + 1}</div>
                        <div className="bg-white p-2 rounded">
                            {answer.map((line, i) => (
                                <>
                                    <div key={i}>{line}</div>
                                    <br />
                                </>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {needsInput && (
                <div className="flex flex-col space-y-2">
                    <div className="font-bold">{inputLabel}</div>
                    <textarea
                        className="bg-white p-2 rounded"
                        onChange={(e) => input(e.target.value)}
                    ></textarea>
                </div>
            )}
        </>
    );
}

function Execute() {
    const nodeData = useNodeStore((state) => state.nodeData, shallow);
    const nodes = useStore((state) => state.nodes, shallow);
    const edges = useStore((state) => state.edges, shallow);
    const nodeMap = nodes.reduce((acc, node) => {
        acc[node.id] = node;
        return acc;
    }, {} as Record<string, any>);
    const sourceToTarget = edges.reduce((acc, edge) => {
        if (!acc[edge.source]) {
            acc[edge.source] = [];
        }
        acc[edge.source].push(edge.target);
        return acc;
    }, {} as Record<string, string[]>);
    const [isValid, setIsValid] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [needsInput, setNeedsInput] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const [output, setOutput] = useState<string[]>([]);

    const onMessage = useCallback((e: MessageEvent) => {
        console.log(e);
        setOutput((prev) => [...prev, e.data]);
        const lines = e.data.split("\n");
        const lastLine = lines[lines.length - 1];
        const regex = /(?:Choose\san\saction)/g;
        setNeedsInput(regex.test(lastLine));
    }, []);

    const onClose = useCallback(() => {
        console.log("closed");
        wsRef.current = null;
    }, []);

    const input = useCallback((s: string) => {
        if (wsRef.current) {
            wsRef.current.send(s);
        }
    }, []);

    useEffect(() => {
        if (!wsRef.current) {
            wsRef.current = new WebSocket("ws://localhost:1337/ws");
            wsRef.current.onmessage = onMessage;
            wsRef.current.onclose = onClose;
        }
    }, []);

    useEffect(() => {
        if (executing) {
            return;
        }

        let valid = true;

        // reset errors
        Object.values(nodeData).forEach((data) => {
            data!.setError(NodeError.None);
        });

        for (let i = 0; i < edges.length; i++) {
            const edge = edges[i];
            const source = nodeMap[edge.source];
            const target = nodeMap[edge.target];
            const sourceData = nodeData[edge.source];
            const targetData = nodeData[edge.target];

            // console.log(sourceData, targetData);
            // console.log(source, target);

            // ensure
            // Before -> Inference
            // After ->? Before
            if (source.type === nodeKeys[0]) {
                if (target.type === nodeKeys[0]) {
                    if (sourceData!.type === NodeType.Before) {
                        valid = false;
                        sourceData!.setError(NodeError.AfterAsChild);
                        targetData!.setError(NodeError.BeforeAsParent);
                        continue;
                    }
                } else if (target.type === nodeKeys[1]) {
                    if (sourceData!.type === NodeType.After) {
                        valid = false;
                        sourceData!.setError(NodeError.InferenceAsChild);
                        continue;
                    }
                }
            }
            // Inference -> After
            else if (source.type === nodeKeys[1]) {
                if (target.type === nodeKeys[0]) {
                    if (targetData!.type === NodeType.Before) {
                        valid = false;
                        targetData!.setError(NodeError.InferenceAsParent);
                        continue;
                    }
                } else if (target.type === nodeKeys[1]) {
                    valid = false;
                    targetData!.setError(NodeError.InferenceAsParent);
                    continue;
                }
            }
        }

        const allInferenceNodesHaveSuccessors = nodes.every((node) => {
            if (node.type === nodeKeys[1]) {
                return !!sourceToTarget[node.id];
            }
            return true;
        });

        setIsValid(valid || !allInferenceNodesHaveSuccessors);
    }, [edges]);

    return (
        <>
            <ExecOutput output={output} needsInput={needsInput} input={input} />

            <button
                className={`bg-rose-200 ${
                    !isValid ? "opacity-50 cursor-not-allowed" : ""
                } rounded px-2 py-1`}
                disabled={!isValid || executing}
            >
                {executing ? "Running" : "Run"}
            </button>
        </>
    );
}

function App() {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useStore(
        selector,
        shallow
    );

    const nodePositions = useStore((state) => state.nodePositions, shallow);
    const addNode = useStore((state) => state.addNode, shallow);
    const deleteEdge = useStore((state) => state.deleteEdge, shallow);
    const getEdges = useStore((state) => state.getEdges, shallow);

    const getFreePosition = useCallback(() => {
        const currentPositions = Object.values(nodePositions()).sort((a, b) => {
            if (a.x !== b.x) {
                return a.x - b.x;
            }
            return a.y - b.y;
        });
        const maxY = 500;
        const maxX = 1000;
        let pos = { x: 0, y: 0 };
        while (true) {
            pos = { x: randint(0, maxX + 1), y: randint(0, maxY + 1) };
            if (!currentPositions.find((p) => p.x === pos.x && p.y === pos.y)) {
                break;
            }
        }
        return pos;
    }, [nodePositions]);

    const genNode = useCallback(
        (isInference: boolean, type?: NodeType) => () => {
            const id = nanoid();
            const data = type;
            const position = getFreePosition();
            addNode({
                id,
                data,
                position,
                type: isInference ? nodeKeys[1] : nodeKeys[0],
            });
        },
        [addNode, getFreePosition]
    );

    const deleteHandler = useCallback(
        (e: KeyboardEvent) => {
            console.log(e);
            if (e.key === "Delete") {
                getEdges().forEach((edge) => {
                    if (edge.selected) {
                        console.log("deleting edge", edge);
                        console.log("deleting edge", edge.id);
                        deleteEdge(edge);
                    }
                });
            }
        },
        [edges]
    );

    useEffect(() => {
        console.log("adding event listener");
        document.addEventListener("keydown", deleteHandler);

        return () => {
            console.log("removing event listener");
            document.removeEventListener("keydown", deleteHandler);
        };
    }, []);

    return (
        <>
            <div className="grid grid-cols-7 h-screen">
                <ReactFlow
                    className="col-span-5"
                    nodes={nodes}
                    onNodesChange={onNodesChange}
                    edges={edges}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                >
                    <Background />
                    <Controls
                        position="bottom-left"
                        className="flex justify-center"
                    />
                    <MiniMap />
                    <Panel
                        position="top-left"
                        className="flex justify-center space-x-2"
                    >
                        <button
                            className="bg-rose-200 rounded px-2 py-1"
                            onClick={genNode(false, NodeType.Before)}
                        >
                            Before Inference
                        </button>
                        <button
                            className="bg-rose-200 rounded px-2 py-1"
                            onClick={genNode(false, NodeType.After)}
                        >
                            After Inference
                        </button>
                        <button
                            className="bg-rose-200 rounded px-2 py-1"
                            onClick={genNode(true)}
                        >
                            Inference
                        </button>
                        <button className="bg-rose-200 rounded px-2 py-1">
                            Panel
                        </button>
                    </Panel>
                </ReactFlow>

                <div className="col-span-2 bg-purple-50 flex flex-col p-4">
                    <Execute />
                </div>
            </div>
        </>
    );
}

export default App;
