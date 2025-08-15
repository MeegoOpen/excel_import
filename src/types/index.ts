import { ReactNode } from 'react';

export interface FieldOptionItem {
  children?: FieldOptionItem[] | null;
  label: string;
  value: string;
  work_item_type_key?: string;
}
export interface FieldItem {
  compound_fields: FieldItem[] | null;
  field_alias: string;
  field_key: string;
  field_name: string;
  field_type_key: string;
  is_custom_field: boolean;
  is_obsoleted: boolean;
  options?: FieldOptionItem[];
  relation_id: string;
  value_generate_mode: string;
  work_item_scopes: any;
}

export type FieldMapItem = FieldItem & {
  optionMap?: Map<string, any>;
  parentName?: string;
  parentKey?: string;
  isCaseDetail?: boolean; // 是否是用例详情复合字段
  isCaseDetailChild?: boolean; // 「步骤」和「预期结果」
  isCompoundField?: boolean;
  isSupportType?: boolean;
  isSystemField?: boolean;
  isNameFieldExist?: boolean;
};

export enum Step {
  UPLOAD = 0,
  PREVIEW,
  EXECUTE,
}

export type FileItemStatus =
  | 'success'
  | 'uploadFail'
  | 'validateFail'
  | 'validating'
  | 'uploading'
  | 'wait';

export interface FileItem {
  showReplace?: boolean;
  showRetry?: boolean;
  response?: any;
  event?: Event;
  status: FileItemStatus;
  name: string;
  size: string;
  uid: string;
  url?: string;
  fileInstance?: File;
  percent?: number;
  _sizeInvalid?: boolean;
  preview?: boolean;
  validateMessage?: ReactNode;
  shouldUpload?: boolean;
  [key: string]: any;
}

export interface ErrorInfo {
  [key: string]: {
    isDuplicate?: boolean;
    notSupported?: boolean;
    invalidOption?: boolean;
    message?: string[];
  };
}

export interface FieldValuePair {
  field_key: string;
  field_value: any;
}

export interface CreateCaseParams {
  rowNumber: number;
  name: string;
  template_id: number | null;
  field_value_pairs: FieldValuePair[];
}

export interface UserInfo {
  user_key: string; //用户userkey
  username: string; //用户userkey
  email: string; //用户邮箱
  name_cn: string; //用户中文名称
  name_en: string; //用户英文名称
  avatar_url: string; //用户头像链接
  out_id: string; // 飞书union_id，是用户在同一应用服务商所开发的多个应用下的统一身份
  status: string; //枚举：resigned：离职；forzen：冻结；activated：使用中
}
