import {
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    addEdge,
    OnNodesChange,
    OnEdgesChange,
    OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
} from 'reactflow';
import { createWithEqualityFn } from 'zustand/traditional';

export type RFState = {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    addNode: (node: Node) => void;
    deleteNode: (nodeId: string) => void;
    addEdge: (edge: Edge) => void;
    deleteEdge: (edge: string) => void;
    nodePositions: () => { [key: string]: { x: number; y: number } };
};

const useStore = createWithEqualityFn<RFState>((set, get) => ({
    nodes: [],
    edges: [],
    nodePositions: () => {
        const positions: { [key: string]: { x: number; y: number } } = {};
        get().nodes.forEach((node) => {
            positions[node.id] = node.position;
        });
        return positions;
    },
    onNodesChange: (changes: NodeChange[]) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },
    onEdgesChange: (changes: EdgeChange[]) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },
    onConnect: (connection: Connection) => {
        set({
            edges: addEdge(connection, get().edges),
        });
    },
    addNode: (node: Node) => {
        set({
            nodes: [...get().nodes, node],
        });
    },
    deleteNode: (nodeId: string) => {
        set({
            nodes: get().nodes.filter((n) => n.id !== nodeId),
            edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        });
    },
    addEdge: (edge: Edge) => {
        set({
            edges: [...get().edges, edge],
        });
    },
    deleteEdge: (edgeId: string) => {
        set({
            edges: get().edges.filter((e) => e.id !== edgeId),
        });
    }
}));

export default useStore;
