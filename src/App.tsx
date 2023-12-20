import ReactFlow, {
    Controls,
    Background,
    MiniMap,
    Panel,
    Edge,
} from "reactflow";

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
    Coach: Inference,
    Coder: Inference,
    Validator: Inference,
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
    const [inputValue, setInputValue] = useState("");

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
                                <div key={i}>
                                    <div>{line}</div>
                                    <br />
                                </div>
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
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    ></textarea>
                    {/*
                        FIXME: Do not use Inline onClick handlers
                    */}
                    <button
                        className="bg-rose-200 rounded px-2 py-1"
                        onClick={() => {
                            input(inputValue);
                            setInputValue("");
                        }}
                    >
                        Submit
                    </button>
                </div>
            )}
        </>
    );
}

function useExecution(
    edges: Edge[],
    sendData: (_: string) => void,
    getResponse: () => string
) {
    const nodes = useStore((state) => state.nodes, shallow);
    const nodeData = useNodeStore((state) => state.nodeData, shallow);
    const remainingEdges = useRef<string[]>(toposort(edges));

    const nextStep = useCallback(() => {
        // serialze the currect edge
        // send it to the server

        if (remainingEdges.current.length === 0) {
            return false;
        }

        const edgeId = remainingEdges.current.shift();
        const edge = edges.find((e) => e.id === edgeId);
        if (!edge) {
            return false;
        }
        const source = nodes.find((n) => n.id === edge.source);
        const target = nodes.find((n) => n.id === edge.target);
        if (!source || !target) {
            return false;
        }
        const sourceData = nodeData[source.id];
        const targetData = nodeData[target.id];

        if (sourceData.type === targetData.type) {
            sendData(`\n`);
            getResponse();
            sendData("E\n"); // go before inference
            sendData("\n"); // and execute inference again
            return true;
        } else {
            sendData("\n");
        }

        return false;
    }, [edges, nodes, nodeData]);

    return { nextStep };
}

function toposort(edges: Edge[]): string[] {
    const nodeMap = edges.reduce((acc, edge) => {
        if (!acc[edge.source]) {
            acc[edge.source] = [];
        }
        acc[edge.source].push(edge.target);
        return acc;
    }, {} as Record<string, string[]>);

    const visited = new Set<string>();
    const sorted: string[] = [];

    const dfs = (node: string) => {
        if (visited.has(node)) {
            return;
        }
        visited.add(node);
        if (nodeMap[node]) {
            nodeMap[node].forEach((child) => dfs(child));
        }
        sorted.push(node);
    };

    Object.keys(nodeMap).forEach((node) => dfs(node));

    return sorted.reverse();
}

function Execute() {
    const nodeData = useNodeStore((state) => state.nodeData, shallow);
    const nodes = useStore((state) => state.nodes, shallow);
    const edges = useStore((state) => state.edges, shallow);
    const nodeMap = nodes.reduce((acc, node) => {
        acc[node.id] = node;
        return acc;
    }, {} as Record<string, any>);
    const [isValid, setIsValid] = useState(true);
    const [executing, setExecuting] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const [output, setOutput] = useState<string[]>([]);
    const processedIx = useRef(0);

    const input = useCallback((s: string) => {
        if (wsRef.current) {
            console.log("sending", s);
            wsRef.current.send(s);
        }
    }, []);
    const getResponse = useCallback(() => {
        let result = "";
        let interval = setInterval(() => {
            if (processedIx.current < output.length) {   
                const res = output.slice(processedIx.current).join("\n");
                processedIx.current = output.length;
                clearInterval(interval);
                result = res; 
            }
        }, 200);
        return result;
    }, [output]);
    const { nextStep } = useExecution(edges, input, getResponse);

    const onMessage = useCallback((e: MessageEvent) => {
        console.log(e);
        setOutput((prev) => [...prev, e.data]);
    }, []);

    const onClose = useCallback(() => {
        console.log("closed");
        wsRef.current = null;
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

        // topological sort
        console.log(edges);
        const sorted = toposort(edges);
        console.log(sorted);

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
                if (target.type === nodeKeys[3]) {
                    valid = false;
                    nodeData[source.id].setError(NodeError.NotCoder);
                    nodeData[target.id].setError(NodeError.NotCoder);
                }
            }
        }

        setIsValid(valid);
    }, [edges]);

    const run = useCallback(() => {
        if (!isValid || executing) {
            return;
        }
        if (!wsRef.current) {
            wsRef.current = new WebSocket("ws://localhost:1337/ws");
            wsRef.current.onmessage = onMessage;
            wsRef.current.onclose = onClose;
        }
        setExecuting(true);
        while (nextStep()) {}
    }, [isValid, executing, nextStep]);

    return (
        <>
            <ExecOutput
                output={output}
                needsInput={false} // FIXME: should be dynamic
                input={input}
                inputLabel={""}
            />

            <button
                className={`bg-rose-200 ${
                    !isValid ? "opacity-50 cursor-not-allowed" : ""
                } rounded px-2 py-1`}
                onClick={run}
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
                                key={key}
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
