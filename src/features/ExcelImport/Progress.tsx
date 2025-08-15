import { memo, useCallback, useContext, useEffect, useState } from 'react';
import { IconUploadError } from '@douyinfe/semi-icons';
import { ExcelImportContext } from './IContext';
import {
  Collapsible,
  List,
  Progress as SemiProgress,
  Typography,
} from '@douyinfe/semi-ui';
import { createWorkItem } from '../../api';

const { Text, Title } = Typography;

const Progress = () => {
  const { data, spaceId, workItemTypeKey, setLoading, enableTemplateList } =
    useContext(ExcelImportContext);
  const [progress, setProgess] = useState(0);
  const [errorLog, setErrorLog] = useState<Record<string, any>[]>([]);

  useEffect(() => {
    if (
      !data.length ||
      !spaceId ||
      !workItemTypeKey ||
      !enableTemplateList.length
    ) {
      return;
    }
    handleCreateWorkItem(data, spaceId, workItemTypeKey, enableTemplateList);
  }, [data, spaceId, workItemTypeKey, enableTemplateList]);

  const handleCreateWorkItem = useCallback(
    async (data, spaceId, workItemTypeKey, enableTemplateList) => {
      const INCREMENT_PERCENT = parseFloat(
        ((1 / data.length) * 100).toFixed(2),
      );
      const _errorLog: Record<string, any>[] = [];
      let progessRecord = 0;
      for (const [index, item] of data.entries()) {
        const templateId = Number(item.template_id) || enableTemplateList[0].id;
        const fieldValuePairs = item.field_value_pairs;
        const res = await createWorkItem({
          project_key: spaceId,
          work_item_type_key: workItemTypeKey,
          template_id: templateId,
          name: item.name,
          fields: fieldValuePairs,
        });
        progessRecord = parseFloat(
          (progessRecord + INCREMENT_PERCENT).toFixed(2),
        );
        setProgess((prevState: number) => {
          const curPro = parseFloat((prevState + INCREMENT_PERCENT).toFixed(2));
          if (index === data.length - 1) {
            return 100;
          }
          if (Math.floor(curPro) === Math.floor(progessRecord)) {
            return prevState;
          } else {
            return Math.ceil(curPro);
          }
        });
        if (res.data === 0 || res?.code !== 0) {
          _errorLog.push({
            name: item.name,
            rowNumber: item.rowNumber,
            logid: res?.logid,
            msg: res?.msg ?? '创建失败',
          });
        }
      }
      setErrorLog(_errorLog);
      setLoading(false);
    },
    [],
  );

  return (
    <div
      style={{
        marginTop: 12,
      }}>
      <SemiProgress
        percent={progress}
        showInfo={true}
      />
      {errorLog.length > 0 && (
        <Collapsible
          isOpen={true}
          duration={300}>
          <List
            dataSource={errorLog}
            header={
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <IconUploadError
                  style={{
                    color: 'var(--semi-color-danger)',
                    marginRight: 12,
                  }}
                />
                <Title heading={5}>{errorLog.length} 条用例导入失败</Title>
              </div>
            }
            renderItem={(item) => (
              <List.Item>
                <Text>
                  创建失败，位于表格第 {item.rowNumber} 行，错误原因为：
                  {item.msg}。
                </Text>
                <Text
                  style={{
                    color: 'var(--semi-color-primary)',
                    cursor: 'pointer',
                  }}
                  onClick={async () => {
                    await window.JSSDK.clipboard.writeText(
                      `${item.msg}-${item.logid}`,
                    );
                    window.JSSDK.toast.success('复制成功');
                  }}>
                  复制错误信息
                </Text>
              </List.Item>
            )}
          />
        </Collapsible>
      )}
    </div>
  );
};

export default memo(Progress);
