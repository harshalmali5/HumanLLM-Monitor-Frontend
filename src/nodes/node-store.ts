import { createWithEqualityFn } from 'zustand/traditional';
import { InferenceNodeData } from './InferenceData';

export type NodeState = {
    nodeData: {
        [key: string]: InferenceNodeData;
    },
    addNode: (key: string, node: InferenceNodeData) => void;
    deleteNode: (key: string) => void;
    updateNode: (key: string, node: InferenceNodeData) => void;
};

const useStore = createWithEqualityFn<NodeState>((set, get) => ({
    nodeData: {},
    addNode: (key: string, node: InferenceNodeData) => {
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
    updateNode: (key: string, node: InferenceNodeData) => {
        set({
            nodeData: {
                ...get().nodeData,
                [key]: node,
            },
        });
    },
}));

export default useStore;
