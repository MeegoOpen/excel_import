import { getUsersInfo } from '../../api';
import {
  CreateCaseParams,
  ErrorInfo,
  FieldMapItem,
  FieldValuePair,
  FileItem,
  FieldItem,
  FieldOptionItem,
  UserInfo,
} from '../../types';
import * as XLSX from 'xlsx';

// 复合字段分隔符
const separator = '#*SGVsbG9Xb3JsZA*#';
const fieldMap: Map<string, FieldMapItem> = new Map();
const supportedFieldMap: Map<string, FieldMapItem> = new Map();
const userInfosMap: Map<string, UserInfo> = new Map();
const templateMap: Map<string, any> = new Map();

// 需要过滤的系统字段
const sysyemFieldKeys = [
  'work_item_status',
  'abort_reason',
  'work_item_type_key',
  'deleted_by',
  'updated_by',
  'watchers',
  'current_status_operator',
  'owner',
  'abort_detail',
  'business',
  'current_status_operator_role',
];

// 支持的字段类型
const supportType = [
  'text',
  'multi_text',
  'select',
  'radio',
  'multi_select',
  'link',
  'tree_select',
  'tree_multi_select',
  'work_item_related_select',
  'work_item_related_multi_select',
  'user',
  'multi_user',
  'work_item_template',
  'compound_field',
];

export async function handleFileData(
  fieldList: FieldItem[],
  fileItem: FileItem,
): Promise<{
  errors: ErrorInfo;
  isNameFieldExist: boolean;
  headers: string[];
  sourceData: Record<string, any>[]; // 表格源数据
  duplicateFieldList: string[];
  data: CreateCaseParams[]; // 处理后的数据
  isOverLimit: boolean;
}> {
  const file = fileItem.fileInstance;
  const reader = new FileReader();
  await convertFieldMap(fieldList);
  return new Promise((resolve, reject) => {
    reader.onload = async (e) => {
      if (e.target && e.target.result) {
        try {
          const data = new Uint8Array(e.target.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
          if (jsonData.length === 0) {
            reject('请勿传入空表格');
            return;
          }
          const sheetDataWithRowNumber = jsonData.map((row, index) => ({
            ...row,
            rowNumber: index + 2, // 行号从 1 开始，所以加 1
          }));
          await handerUsersInfo(sheetDataWithRowNumber);
          let headers = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          })[0] as string[];
          //筛出所有的undef
          headers = headers.filter((header) => header);
          const nameField =
            fieldList.find((item) => item.field_key === 'name')?.field_name ||
            '';
          const isNameFieldExist = headers.includes(nameField);
          const headerErrorInfo = checkHearders(headers);
          const optionsErrorInfo = checkData(sheetDataWithRowNumber);
          const errors = {};
          const duplicateFieldList = Array.from([
            ...new Set(
              Object.keys(headerErrorInfo).filter(
                (key) => headerErrorInfo[key].isDuplicate,
              ),
            ),
          ]);
          headers.forEach((header) => {
            const headerError = headerErrorInfo[header];
            const optionError = optionsErrorInfo[header];
            errors[header] = {
              ...headerError,
              ...optionError,
              message: [
                ...(headerError?.message || []),
                ...(optionError?.message || []),
              ],
            };
          });
          let isOverLimit = false;
          const fieldData = mergeTastCases(sheetDataWithRowNumber, nameField);
          if (fieldData.length > 1000) {
            isOverLimit = true;
            fieldData.splice(1000);
          }
          resolve({
            isOverLimit,
            isNameFieldExist,
            headers,
            errors,
            sourceData: sheetDataWithRowNumber,
            duplicateFieldList,
            data: fieldData,
          });
        } catch (err) {
          window.JSSDK.toast.error('数据获取失败，请刷新重试');
        }
      } else {
        reject(new Error('数据解析时遇到错误!'));
      }
    };
    if (file) {
      reader.readAsArrayBuffer(file);
    }
  });
}

const mergeTastCases = (data, name) => {
  const allTestCases: CreateCaseParams[] = [];
  // 这里只处理支持的字段数据
  const compoundFieldMap: Map<string, FieldMapItem> = new Map();
  supportedFieldMap.forEach((field) => {
    if (field.isCompoundField) {
      compoundFieldMap.set(field.field_name, field);
    }
  });
  // 处理行数据
  const handleRowData = (rowData) => {
    const data: Record<string, FieldValuePair> = {};
    const needMergeFields: string[] = [];
    Object.keys(rowData).forEach((key) => {
      // 行号跟用例名称字段跳过（用例名称在外层传）
      if (key === 'rowNumber' || key === name) {
        return;
      }
      const field = supportedFieldMap.get(key);
      if (!field) {
        // 复合字段
        const compoundField = compoundFieldMap.get(key);
        if (compoundField) {
          const parentFieldKey = compoundField?.parentKey!;
          if (!data[parentFieldKey]) {
            needMergeFields.push(parentFieldKey);
            data[parentFieldKey] = {
              field_key: parentFieldKey,
              field_value: [],
            };
          }
          const _compoundValue = data[parentFieldKey];
          if (!_compoundValue.field_value.length) {
            _compoundValue.field_value.push([
              handleFieldValue(compoundField, rowData[key]),
            ]);
          } else {
            _compoundValue.field_value[0].push(
              handleFieldValue(compoundField, rowData[key]),
            );
          }
          data[parentFieldKey] = _compoundValue;
        }
        return;
      }
      if (field.field_type_key === 'work_item_template') {
        return;
      }
      // 普通字段
      data[field.field_key] = handleFieldValue(field, rowData[key]);
    });
    return {
      data,
      needMergeFields,
    };
  };
  const handleTemplate = (rowData) => {
    let templateId = 0;
    const [firstTemplateId] = templateMap.values();
    Object.keys(rowData).forEach((key) => {
      const field = supportedFieldMap.get(key);
      if (field?.field_type_key === 'work_item_template') {
        templateId = templateMap.get(rowData[key]);
      }
    });
    if (!templateId) {
      templateId = firstTemplateId;
    }
    return Number(templateId);
  };
  data.forEach((row) => {
    if (row[name]) {
      // 新行
      const { data } = handleRowData(row);
      const templateId = handleTemplate(row);
      allTestCases.push({
        rowNumber: row.rowNumber,
        name: String(row[name]),
        template_id: templateId,
        field_value_pairs: Object.values(data),
      });
    } else {
      // 合并行
      const { data: childRowData, needMergeFields } = handleRowData(row);
      const testCase = allTestCases.at(-1)?.field_value_pairs;
      if (!testCase) {
        return;
      }
      testCase?.forEach((item) => {
        if (needMergeFields.includes(item.field_key)) {
          item.field_value.push(childRowData[item.field_key].field_value[0]);
        }
      });
      allTestCases[allTestCases.length - 1].field_value_pairs = testCase;
    }
  });
  return allTestCases;
};

const handleFieldValue = (fieldInfo: FieldMapItem, excelValue: any) => {
  const fieldType = fieldInfo.field_type_key;
  const fieldOptions = fieldInfo?.optionMap;
  const value =
    typeof excelValue === 'number' && fieldType !== 'number'
      ? String(excelValue)
      : excelValue;
  let fieldValue: any = value;
  if (fieldType === 'radio') {
    fieldValue = {
      label: value,
      value: fieldOptions?.get?.(value) || '',
    };
  }
  if (fieldType === 'select' || fieldType === 'multi_select') {
    const labels = String(value).split('|') || [];
    const values: any = [];
    labels.forEach((label) => {
      const value = fieldOptions?.get?.(label);
      value &&
        values.push({
          label,
          value,
        });
    });
    if (fieldType === 'select') {
      fieldValue = values[0];
    } else {
      fieldValue = values;
    }
  }
  if (fieldType === 'tree_select' || fieldType === 'tree_multi_select') {
    const labels = String(value).split('|') || [];
    const values: any = [];
    labels.forEach((label) => {
      const value = fieldOptions?.get?.(label);
      value && values.push(value);
    });
    if (fieldType === 'tree_select') {
      fieldValue = values[0];
    } else {
      fieldValue = values;
    }
  }
  if (fieldType === 'work_item_related_select') {
    fieldValue = Number(value) ?? 0;
  }
  if (fieldType === 'work_item_related_multi_select') {
    fieldValue = value
      ? String(value)
          .split('|')
          .map((item) => Number(item) ?? 0)
      : [];
  }
  if (fieldType === 'user') {
    fieldValue = userInfosMap.get(value)?.user_key;
  }
  if (fieldType === 'multi_user') {
    fieldValue = value
      ? String(value)
          .split('|')
          .map((item) => userInfosMap.get(item)?.user_key)
          .filter((item) => Boolean(item))
      : [];
  }
  return {
    field_key: fieldInfo.field_key,
    field_value: fieldValue,
  };
};

// 检查数据
const checkData = (data) => {
  const error: ErrorInfo = {};
  const numberTypeField = ['work_item_related_select'];
  const selectTypeField = [
    'select',
    'radio',
    'multi_select',
    'tree_select',
    'tree_multi_select',
    'work_item_template',
  ];
  data.forEach((row) => {
    const keys = Object.keys(row); // row是表格表头
    keys.forEach((key: string) => {
      // 跳过行号
      if (key === 'rowNumber') {
        return;
      }
      if (!error[key]) {
        error[key] = {};
      }
      const field = fieldMap.get(key);
      if (!field) {
        return;
      }
      // 仅支持数字值的字段
      if (numberTypeField.includes(field.field_type_key)) {
        if (isNaN(row[key]) || typeof row[key] !== 'number') {
          error[key]['message'] = [
            ...(error[key]['message'] || []),
            '请输入数字',
          ];
          error[key]['invalidOption'] = true;
          return;
        }
      }
      if (selectTypeField.includes(field.field_type_key)) {
        const value = String(row[key]);
        const splitValue = value.split('|');
        // 仅支持单选
        if (
          ['select', 'radio', 'tree_select', 'work_item_template'].includes(
            field.field_type_key,
          ) &&
          splitValue.length > 1
        ) {
          error[key]['message'] = [
            ...(error[key]['message'] || []),
            '仅支持单选',
          ];
          error[key]['invalidOption'] = true;
        }
        if (!field.optionMap || field.optionMap?.size === 0) {
          error[key]['message'] = [
            ...(error[key]['message'] || []),
            `选项不存在: ${splitValue.join(',')}`,
          ];
          return;
        }
        splitValue.forEach((option) => {
          if (!field.optionMap!.has(option)) {
            error[key]['message'] = [
              ...(error[key]['message'] || []),
              `选项不存在: ${option}`,
            ];
            error[key]['invalidOption'] = true;
          }
        });
      }
    });
  });
  return error;
};

// 检查表头
const checkHearders = (headers) => {
  const error: ErrorInfo = {};
  const allFields: FieldMapItem[] = [...fieldMap.values()];
  const allFieldNames = allFields.map((item) => item.field_name);
  headers.forEach((item: string) => {
    error[item] = {};
    // 字段不存在
    if (!allFieldNames.includes(item)) {
      error[item]['message'] = [
        ...(error[item]['message'] || []),
        '字段不存在',
      ];
      return;
    }
    const field = allFields.find((field) => field.field_name === item);
    if (!field) {
      return;
    }
    if (sysyemFieldKeys.includes(field.field_key)) {
      error[item]['message'] = [
        ...(error[item]['message'] || []),
        '系统字段不支持',
      ];
      return;
    }
    if (!supportType.includes(field.field_type_key)) {
      error[item]['message'] = [
        ...(error[item]['message'] || []),
        '该字段类型不支持',
      ];
      return;
    }
  });
  const legalHeaders = Object.keys(error).filter(
    (key) => !error[key]['message'] || error[key]['message']?.length === 0,
  );
  legalHeaders.forEach((item: string) => {
    // 检查是否有重名字段
    const { isDuplicate } = findDuplicatesWithIndexes(allFieldNames, item);
    if (isDuplicate) {
      error[item]['isDuplicate'] = isDuplicate;
    }
  });
  return error;
};

const handerUsersInfo = async (data: Record<string, any>[]) => {
  const userEmails: string[] = [];
  data.forEach((row) => {
    const keys = Object.keys(row);
    keys.forEach((key) => {
      const field = fieldMap.get(key);
      if (!field) return;
      if (field.field_type_key === 'user' && row[key]) {
        userEmails.push(row[key].split('|')[0] ?? '');
      }
      if (field.field_type_key === 'multi_user' && row[key]) {
        userEmails.push(...row[key].split('|'));
      }
    });
  });
  const filterEmails = [...new Set(userEmails.filter((x) => Boolean(x)))];
  if (filterEmails.length === 0) {
    return;
  }
  const userInfos = await getUsersInfo(filterEmails);
  userInfos.forEach((userInfo) => {
    userInfosMap.set(userInfo.email, userInfo);
  });
};

function convertFieldMap(fieldList: FieldItem[], parent?: FieldItem) {
  fieldList.forEach((field) => {
    const fieldName = parent
      ? `${parent.field_name}${separator}${field.field_name}`
      : field.field_name;
    const newField: FieldMapItem = {
      ...field,
    };
    if (parent) {
      newField.parentName = parent.field_name;
      newField.parentKey = parent.field_key;
      newField.isCompoundField = true;
    }
    if (sysyemFieldKeys.includes(field.field_key)) {
      newField.isSystemField = true;
    }
    if (supportType.includes(field.field_type_key)) {
      newField.isSupportType = true;
    }
    // 选项
    if (
      ['select', 'multi_select', 'radio', 'work_item_template'].includes(
        field.field_type_key,
      ) &&
      field.options
    ) {
      const optionMap = new Map();
      field.options.forEach((option) => {
        optionMap.set(option.label, option.value);
        if (field.field_type_key === 'work_item_template') {
          templateMap.set(option.label, option.value);
        }
      });
      newField.optionMap = optionMap;
    }
    // 级联选项
    if (
      ['tree_select', 'tree_multi_select'].includes(field.field_type_key) &&
      field.options
    ) {
      const optionMap = new Map();
      const treeLabels = getTreeFiledLabel(field.options, '');
      treeLabels.forEach((treeLabel) => {
        const items = treeLabel.split('/');
        const value = getTreeValueFormLabel(field.options, items);
        optionMap.set(treeLabel, value);
      });
      newField.optionMap = optionMap;
    }
    fieldMap.set(fieldName, newField);
    // 这里存储所有支持的字段
    if (!newField.isSystemField && newField.isSupportType) {
      supportedFieldMap.set(fieldName, newField);
    }
    if (field.compound_fields && field.compound_fields.length > 0) {
      convertFieldMap(field.compound_fields, field);
    }
  });
}

export function getExcelTemplateHeader(fieldList: FieldItem[]) {
  const headers: string[] = [];
  const handle = (data: FieldItem[]) => {
    data.forEach((field) => {
      if (
        !sysyemFieldKeys.includes(field.field_key) &&
        supportType.includes(field.field_type_key)
      ) {
        headers.push(field.field_name);
      }
      if (field.compound_fields && field.compound_fields.length > 0) {
        handle(field.compound_fields);
      }
    });
  };
  handle(fieldList);
  return headers;
}

// 获取级联字段的所有组合label
const getTreeFiledLabel = (
  treeData: FieldOptionItem[],
  parentLabel: string,
) => {
  const result: string[] = [];
  for (const node of treeData) {
    const currentLabel = parentLabel
      ? `${parentLabel}/${node.label}`
      : node.label;
    result.push(currentLabel);
    if (node.children && node.children.length > 0) {
      result.push(...getTreeFiledLabel(node.children, currentLabel));
    }
  }
  return result;
};

// 根据label获取级联字段的value
const getTreeValueFormLabel = (tree, labels) => {
  // 递归处理树的函数
  function recursiveFilter(subTree, level) {
    if (level >= labels.length) {
      return null;
    }
    const labelToMatch = labels[level];
    const matchedNode = subTree.find((node) => node.label === labelToMatch);
    if (!matchedNode) {
      return null;
    }
    return {
      label: matchedNode.label,
      value: matchedNode.value || null,
      children: matchedNode.children
        ? recursiveFilter(matchedNode.children, level + 1)
        : level + 1 === labels.length
        ? null
        : {},
    };
  }
  return recursiveFilter(tree, 0);
};

const findDuplicatesWithIndexes = (
  arr,
  target,
): {
  isDuplicate: boolean;
  indexes: number[];
} => {
  const indexes: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) indexes.push(i);
  }
  return {
    isDuplicate: indexes.length >= 2,
    indexes: indexes,
  };
};
