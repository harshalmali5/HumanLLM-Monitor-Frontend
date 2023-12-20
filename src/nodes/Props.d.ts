import NodeData, { NodeType } from './NodeData';
import { NodeProps } from 'reactflow';
import { INodeData } from '../types/NodeData';
import { AfterBeforeData, InferenceNodeData } from './InferenceData';

export type NodeProps = NodeProps<NodeType>;

export type InferenceProps = NodeProps<InferenceNodeData>;
