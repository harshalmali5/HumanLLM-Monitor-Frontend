import ReactFlow, {
    Controls,
    Background,
    MiniMap,
    Panel,
    Edge,
    Node,
} from "reactflow";

import { nanoid } from "nanoid";
import { shallow } from "zustand/shallow";
import useStore, { RFState } from "./store";
import { useCallback, useEffect, useRef, useState } from "react";
import { NodeType } from "./nodes/NodeData";
import useNodeStore from "./nodes/node-store";
import Markdown from "react-markdown";
import { NodeError } from "./nodes/error";
import Inference from "./nodes/Inference";

import "reactflow/dist/style.css";
import OptionN from "./nodes/Option";

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
    Critic: Inference,
    Validator: Inference,
    Capitalizer: Inference,
    After: OptionN,
    Before: OptionN,
};

const CapitalizerNodeType = "Capitalizer";
const AfterNodeType = "After";
const BeforeNodeType = "Before";

const nodeKeys = Object.keys(nodeTypes);

const randint = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

interface ExecOutputProps {
    output: string[];
    edges: Edge[];
}

type ExecAnswer = [string[], boolean];

const startRegex = /LLM ANSWER/;
const endRegex = /\*{5}\s\w+/;
const startRefinedRegex = /REFINED ANSWER/;
const beforeInferenceRegex = /Choose an action \(or hit Enter for inference\) :$/;
const refinedEnd = /Is the task refinement adequate\?$/;
const criticRegex = /Provide critic\/feedback\/request\: $/;

function ExecOutput({ output, edges }: ExecOutputProps) {
    const [processedOutput, setProcessedOutput] = useState<ExecAnswer[]>([]);
    const parsedTillRef = useRef(0);
    const seenTill = useRef(0);
    const nodeMap = useNodeStore((state) => state.nodeData, shallow);
    const executionOrder = edges.map((edge) => edge.source);
    const selectedIds = Object.entries(nodeMap)
        .filter(([_, data]) => data.type === NodeType.Inference && data.InferenceData?.selected)
        .map(([id, _]) => id);

    useEffect(() => {
        if (!output.length) {
            setProcessedOutput([]);
            seenTill.current = 0;
            parsedTillRef.current = 0;
        }
        if (output.length == seenTill.current) return;
        seenTill.current = output.length;

        const out = output
            .slice(parsedTillRef.current)
            .map((x) => x.split("\n"));

        const newAnswers: ExecAnswer[] = [];
        let parsedTill = 0;

        // O(n) where n = number of lines
        for (let i = 0; i < out.length; i++) {
            for (let j = 0; j < out[i].length; j++) {
                const llmAns = startRegex.test(out[i][j]);
                const refinedAns = startRefinedRegex.test(out[i][j]);
                if (llmAns || refinedAns) {
                    const answer: string[] = [];
                    let refinedMatch = false;
                    for (let k = j + 1; k < out[i].length; k++) {
                        const a = [...answer, out[i][k]];
                        const astr = a.join("");
                        if (
                            endRegex.test(astr) ||
                            (refinedMatch = refinedEnd.test(astr))
                        ) {
                            j = k;
                            parsedTill = i;
                            break;
                        }
                        answer.push(out[i][k]);
                    }
                    newAnswers.push([
                        answer,
                        refinedMatch,
                    ]);
                }
            }
        }

        if (newAnswers.length > 0) {
            parsedTillRef.current += parsedTill + 1;
            setProcessedOutput((prev) => [...prev, ...newAnswers]);
        }
    }, [output]);

    return (
        <>
            {/* FIXME: show which node an answer is related to! */}
            <div className="flex flex-col space-y-2">
                {processedOutput
                    .filter(
                        (_, i) => !selectedIds.length || selectedIds.includes(executionOrder[i])
                    )
                    .map((answer, i) => (
                        <div key={i} className="flex flex-col space-y-2">
                            <div className="font-bold">
                                {answer[1] ? "Refined Answer" : "LLM Answer"}
                            </div>
                            <div className="bg-white p-2 rounded">
                                {answer[0].map((line, i) => (
                                    <Markdown key={i}>{line}</Markdown>
                                ))}
                            </div>
                        </div>
                    ))}
            </div>
        </>
    );
}

function useExecution(
    edges: Edge[],
    sendData: (_: string) => void,
    waitWsMessage: (_: RegExp) => Promise<void>
) {
    const nodes = useStore((state) => state.nodes, shallow);
    const nodeData = useNodeStore((state) => state.nodeData, shallow);
    const edgeIx = useRef(0);
    const feedbackReceivedRef = useRef(false);

    const FeedBackInput = () => {
        const [feedback, setFeedback] = useState("");

        const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setFeedback(e.target.value);
        };

        const onSubmit = () => {
            sendData(feedback + "\n");
            setFeedback("");
            feedbackReceivedRef.current = true;
            edgeIx.current++;
        };

        return (
            <>
                <textarea
                    className="bg-white p-2 my-2 rounded h-32 border-2 border-gray-300"
                    value={feedback}
                    onChange={onChange}
                    rows={10}
                ></textarea>
                <button
                    className="bg-rose-200 rounded px-2 py-1"
                    onClick={onSubmit}
                >
                    Submit
                </button>
            </>
        );
    };

    const nextStep = useCallback(() => {
        // serialze the currect edge
        // send it to the server

        const p = new Promise<boolean>((resolve) => {
            const remainingEdges = edges.slice(edgeIx.current);

            if (remainingEdges.length === 0) {
                return false;
            }

            const edge = remainingEdges.shift();
            if (!edge) {
                return false;
            }
            const source = nodes.find((n) => n.id === edge.source);
            const target = nodes.find((n) => n.id === edge.target);
            if (!source || !target) {
                return false;
            }

            Object.values(nodeData).forEach((data) => {
                if (data.type === NodeType.Inference) {
                    data.InferenceData?.setBorderCss("");
                }
            });

            const targetData = nodeData[target.id];
            targetData?.InferenceData?.setBorderCss("border-4 border-teal-500");

            if (edgeIx.current === nodes.length) {
                resolve(false);
                return;
            }

            waitWsMessage(beforeInferenceRegex)
                .then(async () => {
                    switch (target.type) {
                        case "Critic": {
                            sendData("\nB\n");
                            await waitWsMessage(criticRegex);
                            feedbackReceivedRef.current = false;
                            sendData("y\nyes\nyes");
                            break;
                        }
                        case "After": {
                            sendData(targetData?.OptionData?.choice + "\n");
                            edgeIx.current++;
                            resolve(true);
                            break;
                        }
                        case "Before": {
                            const choice = targetData?.OptionData?.choice;
                            sendData(choice + "\n");
                            if (choice && /[A-F]/.test(choice)) {
                                sendData("Y\n");
                            }
                            edgeIx.current++;
                            resolve(true);
                            break;
                        }
                        default: {
                            sendData("\n");
                            edgeIx.current++;
                            resolve(true);
                        }
                    }
                })
                .catch(() => {
                    resolve(false);
                });
        });
        return p;
    }, [edges, nodes, nodeData]);

    return { nextStep, FeedBackInput };
}

function toposort(edges: Edge[]): Edge[] {
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

    const nodeIds = sorted.reverse();
    const nodeIdToIx = Object.fromEntries(nodeIds.map((x, i) => [x, i]));

    const sortedEdges = edges.sort(
        (a, b) => nodeIdToIx[a.source] - nodeIdToIx[b.source]
    );
    return sortedEdges;
}

function Execute() {
    const nodeData = useNodeStore((state) => state.nodeData, shallow);
    const nodes = useStore((state) => state.nodes, shallow);
    const edges = useStore((state) => state.edges, shallow);
    const nodeMap = nodes.reduce((acc, node) => {
        acc[node.id] = node;
        return acc;
    }, {} as Record<string, Node>);
    const [isValid, setIsValid] = useState(true);
    const [executing, setExecuting] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const [output, setOutput] = useState<string[]>([]);
    const processedIx = useRef(0);

    const sendData = useCallback((s: string) => {
        if (wsRef.current) {
            wsRef.current.send(s);
        }
    }, []);

    // used to wait for the websocket to send a message
    const waitWsMessage = useCallback((re: RegExp) => {
        return new Promise<void>((resolve, reject) => {
            if (!wsRef.current) {
                reject();
                return;
            }
            wsRef.current.onmessage = (e) => {
                const o = [...output, e.data];
                if (re.test(o.join(""))) {
                    resolve();
                }
                setOutput(o);
            };
        });
    }, []);

    const toposortedEdges = toposort(edges);
    const { nextStep } = useExecution(
        toposortedEdges,
        sendData,
        waitWsMessage
    );

    const onClose = useCallback(() => {
        wsRef.current = null;
    }, []);

    const stopExecution = useCallback(() => {
        setExecuting(false);
        setOutput([]);
        processedIx.current = 0;
        wsRef.current?.close();
    }, []);

    useEffect(() => {
        if (executing) {
            return;
        }

        let valid = true;

        // reset errors
        Object.values(nodeData).forEach((data) => {
            data?.InferenceData?.setError(NodeError.None);
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
                    nodeData[source.id]?.InferenceData?.setError(NodeError.FirstIsNotCoach);
                }
            } else if (i === edges.length - 1) {
                if (target.type !== CapitalizerNodeType) {
                    valid = false;
                    nodeData[target.id]?.InferenceData?.setError(
                        NodeError.LastIsNotCapitalizer
                    );
                }
            } else if (source.type == BeforeNodeType && target.type === AfterNodeType) {
                valid = false;
                nodeData[target.id]?.OptionData?.setError(NodeError.BeforeThenAfter);
            } else if (source.type === AfterNodeType && target.type === AfterNodeType) {
                valid = false;
                nodeData[target.id]?.OptionData?.setError(NodeError.TwoAfter);
            } else if (source.type === BeforeNodeType && target.type === BeforeNodeType) {
                valid = false;
                nodeData[target.id]?.OptionData?.setError(NodeError.TwoBefore);
            }
        }

        setIsValid(valid);
    }, [edges]);

    const run = useCallback(() => {
        if (!isValid || executing) {
            return;
        }
        setOutput([]);
        processedIx.current = 0;

        if (wsRef.current) {
            wsRef.current.close();
        }
        wsRef.current = new WebSocket("ws://localhost:1337/ws");
        wsRef.current.onclose = onClose;
        setExecuting(true);
        async function recPromise() {
            let res = true;
            while (res) {
                res = await nextStep();
            }
            setExecuting(false);
        }
        waitWsMessage(beforeInferenceRegex).then(() => {
            sendData("\n");
            recPromise();
        });
    }, [isValid, executing, nextStep]);

    const handleClick = () => {
        if (executing) {
            stopExecution();
        } else {
            run();
        }
    };

    return (
        <>
            <ExecOutput output={output} edges={toposortedEdges} />

            <button
                className={`bg-rose-200 ${!isValid ? "opacity-50 cursor-not-allowed" : ""
                    } rounded px-2 py-1`}
                onClick={handleClick}
                disabled={!isValid}
            >
                {executing ? "Stop" : "Run"}
            </button>
        </>
    );
}

const initNodes = [
    {
        id: "1",
        type: "Coach",
        position: { x: 100, y: 100 },
        data: "",
    },
    {
        id: "BeforeCoder",
        type: "Before",
        position: { x: 100, y: 350 },
        data: "",
    },
    {
        id: "2",
        type: "Coder",
        position: { x: 100, y: 600 },
        data: "",
    },
    {
        id: "AfterCoder",
        type: "Before",
        position: { x: 100, y: 850 },
        data: "",
    },
    {
        id: "3",
        type: "Critic",
        position: { x: 100, y: 1100 },
        data: "",
    },
    {
        id: "4",
        type: "Validator",
        position: { x: 100, y: 1350 },
        data: "",
    },
    {
        id: "5",
        type: "Capitalizer",
        position: { x: 100, y: 1600 },
        data: "",
    },
];

const initEdges = [
    {
        id: "e1",
        source: "1",
        target: "2",
    },
    {
        id: "e2",
        source: "2",
        target: "3",
    },
    {
        id: "e3",
        source: "3",
        target: "4",
    },
    {
        id: "e4",
        source: "4",
        target: "5",
    },
];

function App() {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useStore(
        selector,
        shallow
    );
    const generatedRef = useRef(false);
    const addEdge = useStore((state) => state.addEdge, shallow);

    useEffect(() => {
        if (generatedRef.current) {
            return;
        }
        initNodes.forEach((node) => {
            addNode(node);
        });
        initEdges.forEach((edge) => {
            addEdge(edge);
        });

        generatedRef.current = true;
    }, []);

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

    useEffect(() => {
        if (generatedRef.current) {
            return;
        }
        generatedRef.current = true;
    }, []);

    const deleteHandler = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === "Delete") {
                getEdges().forEach((edge) => {
                    if (edge.selected) {
                        deleteEdge(edge);
                    }
                });
            }
        },
        [edges]
    );

    useEffect(() => {
        document.addEventListener("keydown", deleteHandler);

        return () => {
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

                <div className="col-span-3 bg-purple-50 flex flex-col p-4 h-screen overflow-y-scroll">
                    <Execute />
                </div>
            </div>
        </>
    );
}

export default App;
