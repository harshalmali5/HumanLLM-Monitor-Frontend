import ReactFlow, { Controls, Background, MiniMap, Panel } from "reactflow";

import { nanoid } from "nanoid";
import { shallow } from "zustand/shallow";
import useStore, { RFState } from "./store";
import { useCallback, useEffect, useState } from "react";
import AfterBeforeNode from "./nodes/AfterBeforeNode";
import { NodeType } from "./nodes/NodeData";
import InferenceNode from "./nodes/InferenceNode";
import useNodeStore from "./nodes/node-store";

import "reactflow/dist/style.css";

const selector = (state: RFState) => ({
    nodes: state.nodes,
    edges: state.edges,
    onNodesChange: state.onNodesChange,
    onEdgesChange: state.onEdgesChange,
    onConnect: state.onConnect,
    addNode: state.addNode,
});

const nodeTypes = {
    "AfterBeforeNode": AfterBeforeNode,
    "InferenceNode": InferenceNode,
};

const nodeKeys = Object.keys(nodeTypes);

const randint = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

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

    useEffect(() => {
        let valid = true;

        // reset errors 
        Object.values(nodeData).forEach((data) => {
            data!.setError(false);
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
                        sourceData!.setError(true);
                        continue;
                    }
                } else if (target.type === nodeKeys[1]) {
                    if (sourceData!.type === NodeType.After) {
                        valid = false;
                        sourceData!.setError(true);
                        continue;
                    }
                }
            }
            // Inference -> After
            else if (source.type === nodeKeys[1]) {
                if (target.type === nodeKeys[0]) {
                    if (targetData!.type === NodeType.Before) {
                        valid = false;
                        targetData!.setError(true);
                        continue;
                    }
                } else if (target.type === nodeKeys[1]) {
                    valid = false;
                    targetData!.setError(true);
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
        <div className="flex flex-col space-y-2">
            <button
                className="bg-rose-200 rounded px-2 py-1"
                disabled={!isValid}
            >
                Generate Input
            </button>
        </div>
    );
}

function App() {
    const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useStore(
        selector,
        shallow
    );

    const nodePositions = useStore((state) => state.nodePositions, shallow);
    const addNode = useStore((state) => state.addNode, shallow);
    const deleteNode = useStore((state) => state.deleteNode, shallow);
    const deleteEdge = useStore((state) => state.deleteEdge, shallow);

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
            if (e.key === "Delete") {
                nodes.forEach((node) => {
                    if (node.selected) {
                        deleteNode(node.id);
                    }
                });
                edges.forEach((edge) => {
                    if (edge.selected) {
                        deleteEdge(edge.id);
                    }
                });
            }
        },
        [nodes, edges]
    );

    useEffect(() => {
        document.addEventListener("keydown", deleteHandler);

        return () => {
            document.removeEventListener("keydown", deleteHandler);
        };
    }, []);

    return (
        <>
            <ReactFlow
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
                    <Execute />
                </Panel>
            </ReactFlow>
        </>
    );
}

export default App;
