import { memo, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { handleFileData } from './utils';
import { uniq } from 'lodash';
import { ExcelImportContext } from './IContext';
import { Banner, Spin, Table, Tooltip, Typography } from '@douyinfe/semi-ui';
import { IconInfoCircle } from '@douyinfe/semi-icons';

const { Text } = Typography;

const Preview = () => {
  const {
    fieldList,
    fileItem,
    errorInfo,
    setErrorInfo,
    isNameFieldExist,
    setIsNameFieldExist,
    setData,
    data,
    setIsOverLimit,
    isOverLimit,
    enableTemplateList,
  } = useContext(ExcelImportContext);
  const [dataSource, setDataSource] = useState<Record<string, any>[]>([]);
  const previewContent = useRef<HTMLDivElement>(null);
  const contentHeader = useRef<HTMLDivElement>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [duplicateFieldList, setDuplicateFieldList] = useState<string[]>([]);
  const [name, setName] = useState<string>('');

  useEffect(() => {
    if (!fieldList.length) return;
    const name = fieldList.find(
      (item) => item.field_key === 'name',
    )?.field_name;
    setName(name ?? '');
  }, [fieldList]);

  useEffect(() => {
    if (!fileItem) return;
    if (!fieldList) return;
    if (!fileItem.fileInstance) return;
    handleFileData(fieldList, fileItem)
      .then((res) => {
        const {
          sourceData,
          headers,
          duplicateFieldList,
          data,
          errors,
          isNameFieldExist,
          isOverLimit,
        } = res;
        setIsOverLimit(isOverLimit);
        setIsNameFieldExist(isNameFieldExist);
        setErrorInfo(errors);
        setDataSource(sourceData);
        setData(data);
        setHeaders(headers);
        setDuplicateFieldList(duplicateFieldList);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fieldList, fileItem]);

  const columns = useMemo(
    () =>
      (headers || []).map((header) => {
        const error = errorInfo?.[header]?.message;
        return {
          width: 200,
          title: error?.length ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span>{header}</span>
              <Tooltip
                style={{
                  maxHeight: 400,
                  overflow: 'auto',
                }}
                title={'规范说明'}
                content={
                  <>
                    {uniq(error || []).map((item: string) => (
                      <div key={item}>{item}</div>
                    ))}
                  </>
                }
                selfControl>
                <IconInfoCircle
                  style={{
                    marginLeft: 8,
                    // color: 'var(--semi-color-danger)',
                  }}
                />
              </Tooltip>
            </div>
          ) : (
            header
          ),
          dataIndex: header,
          key: header,
          render: (text) => (
            <Text
              style={{ width: 166 }}
              ellipsis={{
                rows: 3,
                showTooltip: true,
              }}>
              {text ?? ''}
            </Text>
          ),
        };
      }),

    [headers, errorInfo],
  );

  const tableScrollY = useMemo(() => {
    const previewContentHeight = previewContent?.current?.clientHeight ?? 0;
    const contentHeaderHeight = contentHeader?.current?.clientHeight ?? 0;
    return previewContentHeight - contentHeaderHeight - 128;
  }, [isNameFieldExist, duplicateFieldList]);

  return (
    <>
      <div
        style={{ width: '100%', height: '100%' }}
        className="preview-content"
        ref={previewContent}>
        <Spin
          wrapperClassName="spin-wrapper"
          spinning={loading}></Spin>
        <div ref={contentHeader}>
          {enableTemplateList.length === 0 ? (
            <Banner
              style={{
                margin: '12px 0',
              }}
              fullMode={false}
              type="danger"
              description={<Text>请先配置模板</Text>}
            />
          ) : null}
          {isOverLimit ? (
            <Banner
              style={{
                margin: '12px 0',
              }}
              fullMode={false}
              type={'warning'}
              description={
                <Text>
                  单次导入仅支持1000条用例，本次导入将导入表格中前1000条用例。
                </Text>
              }
            />
          ) : null}
          {!isNameFieldExist ? (
            <Banner
              style={{
                margin: '12px 0',
              }}
              fullMode={false}
              type="danger"
              description={<Text>缺少必填字段: {name}</Text>}
            />
          ) : null}
          {duplicateFieldList.length ? (
            <Banner
              style={{
                margin: '12px 0',
              }}
              fullMode={false}
              type="info"
              description={
                <Text>检查到存在重复字段: {duplicateFieldList.join(',')}</Text>
              }
            />
          ) : null}
        </div>
        <Table
          bordered
          style={{
            margin: '12px 0',
          }}
          columns={columns}
          dataSource={dataSource}
          scroll={{
            x: 'max-content',
            y: tableScrollY,
          }}
          pagination={{
            pageSize: 20,
            position: 'bottom',
            formatPageText: () => <Text>共 {data.length} 条用例</Text>,
          }}
        />
      </div>
    </>
  );
};

export default memo(Preview);
