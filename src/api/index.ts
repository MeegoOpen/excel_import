import request from './request';
import { FieldItem, FieldValuePair, UserInfo } from '../types';

interface ResponseWrap<T> {
  data?: T;
  code: number;
  msg?: string;
  logid?: string;
}

/** 获取工作项字段 */
export async function getWorkItemFields(
  project_key: string,
  work_item_type_key: string,
) {
  return request
    .post<FieldItem[]>(`/open_api/${project_key}/field/all`, {
      work_item_type_key,
    })
    .then((res) => res.data);
}

export async function createWorkItem(params: {
  project_key: string;
  work_item_type_key: string;
  template_id: number;
  name: string;
  fields: FieldValuePair[];
}) {
  return request.post<any, ResponseWrap<number>>(
    `/open_api/${params.project_key}/work_item/create`,
    {
      work_item_type_key: params.work_item_type_key,
      template_id: params.template_id,
      name: params.name,
      field_value_pairs: params.fields,
    },
  );
}

// 获取用户详情
export async function getUsersInfo(emails: string[]) {
  return request
    .post<unknown, ResponseWrap<{ data?: UserInfo[] }>>(
      `/open_api/user/query`,
      {
        emails,
      },
    )
    .then((res) => res.data?.data || []);
}
