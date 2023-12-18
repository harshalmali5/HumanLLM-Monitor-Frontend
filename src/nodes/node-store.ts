import { createWithEqualityFn } from 'zustand/traditional';
import { AfterBeforeData } from './AfterBeforeData';

export type NodeState = {
    nodeData: {
        [key: string]: AfterBeforeData;
    },
    addNode: (key: string, node: AfterBeforeData) => void;
    deleteNode: (key: string) => void;
    updateNode: (key: string, node: AfterBeforeData) => void;
};

const useStore = createWithEqualityFn<NodeState>((set, get) => ({
    nodeData: {},
    addNode: (key: string, node: AfterBeforeData) => {
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
    updateNode: (key: string, node: AfterBeforeData) => {
        set({
            nodeData: {
                ...get().nodeData,
                [key]: node,
            },
        });
    },
}));

export default useStore;
