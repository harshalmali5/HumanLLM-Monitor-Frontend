import { createWithEqualityFn } from 'zustand/traditional';
import { NodeData } from './NodeData';

export type NodeState = {
    nodeData: {
        [key: string]: NodeData;
    },
    addNode: (key: string, node: NodeData) => void;
    deleteNode: (key: string) => void;
    updateNode: (key: string, node: NodeData) => void;
};

const useStore = createWithEqualityFn<NodeState>((set, get) => ({
    nodeData: {},
    addNode: (key: string, node: NodeData) => {
        set({
            nodeData: {
                ...get().nodeData,
                [key]: node,
            },
        });
    },
    deleteNode: (key: string) => {
        const { [key]: _, ...rest } = get().nodeData;
        set({
            nodeData: rest,
        });
    },
    updateNode: (key: string, node: NodeData) => {
        set({
            nodeData: {
                ...get().nodeData,
                [key]: node,
            },
        });
    },
}));

export default useStore;
