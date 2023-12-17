import NodeData, { NodeType } from './NodeData';
import { NodeProps } from 'reactflow';
import { INodeData } from '../types/NodeData';
import { AfterBeforeData } from './AfterBeforeData';

export type NodeProps = NodeProps<NodeType>;

export type AfterBeforeProps = NodeProps<AfterBeforeData>;

export type InferenceProps = NodeProps<string>;
