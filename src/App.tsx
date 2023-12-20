import ReactFlow, { Controls, Background, MiniMap, Panel } from "reactflow";

import { nanoid } from "nanoid";
import { shallow } from "zustand/shallow";
import useStore, { RFState } from "./store";
import { useCallback, useEffect, useRef, useState } from "react";
import { NodeType } from "./nodes/node-types";
import useNodeStore from "./nodes/node-store";

import "reactflow/dist/style.css";
import { NodeError } from "./nodes/InferenceData";
import Inference from "./nodes/Inference";

const selector = (state: RFState) => ({
    nodes: state.nodes,
    edges: state.edges,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    addNode: state.addNode,
});

const nodeTypes = {
    Coder: Inference,
    Validator: Inference,
    Coach: Inference,
    Capitalizer: Inference,
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
        setProcessedOutput((p) => [...p, ...answers.map((x) => x.split("\n"))]);
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
                    <button
                        className="bg-rose-200 rounded px-2 py-1"
                        onClick={() => input("")}
                    >
                        Submit
                    </button>
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
    const [inputLabel, setInputLabel] = useState("");
    const wsRef = useRef<WebSocket | null>(null);
    const [output, setOutput] = useState<string[]>([]);

    const onMessage = useCallback((e: MessageEvent) => {
        console.log(e);
        setOutput((prev) => [...prev, e.data]);
        const lines = e.data.split("\n");
        const lastLine = lines[lines.length - 1];
        const regex =
            /(?:Choose\san\saction)|(?:critic\/feedback\/request\:)|(?:\(yes\/no\)\:)|(?:(or\shit\senter)\:)/g;
        setNeedsInput(regex.test(lastLine));
        setInputLabel(lastLine.replace(/\x1b\[\d\d?m/g, " "));
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

            // first node is coach and last is capitalizer
            // then (coder->critic)* in the middle
            if (i === 0) {
                if (source.type !== nodeKeys[0]) {
                    valid = false;
                    nodeData[source.id].setError(NodeError.FirstIsNotCoach);
                }
            } else if (i === edges.length - 1) {
                if (target.type !== nodeKeys[nodeKeys.length - 1]) {
                    valid = false;
                    nodeData[target.id].setError(
                        NodeError.LastIsNotCapitalizer
                    );
                }
            } else {
                if (
                    source.type !== nodeKeys[1] ||
                    target.type !== nodeKeys[1]
                ) {
                    valid = false;
                    nodeData[source.id].setError(NodeError.NotCoder);
                    nodeData[target.id].setError(NodeError.NotCoder);
                }
            }
        }

        setIsValid(valid);
    }, [edges]);

    return (
        <>
            <ExecOutput
                output={output}
                needsInput={needsInput}
                input={input}
                inputLabel={inputLabel}
            />

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
        (type: string, afterBeforeType?: NodeType) => () => {
            const id = nanoid();
            const data = afterBeforeType ?? "";
            const position = getFreePosition();
            addNode({
                id,
                data,
                position,
                type,
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
                    className="col-span-4"
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
                        {nodeKeys.map((key) => (
                            <button
                                className="bg-rose-200 rounded px-2 py-1"
                                onClick={genNode(key)}
                            >
                                {key}
                            </button>
                        ))}
                    </Panel>
                </ReactFlow>

                <div className="col-span-3 bg-purple-50 flex flex-col p-4">
                    <Execute />
                </div>
            </div>
        </>
    );
}

export default App;
