import { Edge, Node } from "reactflow";
import NodeData, { NodeType } from "../nodes/NodeData";
import { useCallback, useState, useRef, useEffect } from "react";
import ModifyAnswer from "./ModifiyAnswer";
import React from "react";
import { BeforeChoice } from "../nodes/AfterBeforeData";

const useExecution = (
    nodes: Node[],
    edges: Edge[],
    startNodeId: string,
    nodeMap: Record<string, NodeData>,
    appendPanel: (_: React.FC<any>) => void,
    ws: WebSocket
) => {
    const [currNode, setCurrNode] = useState<Node | null>(null);
    const [chooseBwNodeIds, setChooseBwNodeIds] = useState<string[]>([]);
    const [needInput, setNeedInput] = useState<boolean>(false);
    const [inputLabel, setInputLabel] = useState<string>("");
    const [paused, setPaused] = useState<boolean>(false);
    const prevNodeIdRef = useRef<string>("");
    const edgeMap = edges.reduce((acc, edge) => {
        acc[edge.source] = edge.target;
        return acc;
    }, {} as Record<string, string>);

    useEffect(() => {
        setCurrNode(nodes.filter(node => node.id == startNodeId)[0]);
    }, []);

    const setChoice = (nodeId: string) => {
        setChooseBwNodeIds([]);
        setCurrNode(nodes.filter(node => node.id == nodeId)[0]);
    }

    return { currNode, chooseBwNodeIds, setChoice };
}
