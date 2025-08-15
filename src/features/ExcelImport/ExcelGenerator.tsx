import { Button } from '@douyinfe/semi-ui';
import React, { memo, useCallback, useContext, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { ExcelImportContext } from './IContext';
import { IconDownload } from '@douyinfe/semi-icons';
import { getWorkItemFields } from '../../api';
import { getExcelTemplateHeader } from './utils';

function ExcelGenerator() {
  const { spaceId, workItemTypeKey, setFiledList, fieldList } =
    useContext(ExcelImportContext);

  useEffect(() => {
    if (!spaceId || !workItemTypeKey) {
      return;
    }
    getWorkItemFields(spaceId, workItemTypeKey).then((res) => {
      setFiledList(res || []);
    });
  }, [spaceId, workItemTypeKey]);

  const handleDownload = useCallback(async () => {
    if (!spaceId || !workItemTypeKey || fieldList.length === 0) {
      return;
    }
    const { allWorkObjectList } = await window.JSSDK.Space.load(spaceId);
    const workObjectName =
      allWorkObjectList.find((item) => item.id === workItemTypeKey)?.name || '';
    const headers = getExcelTemplateHeader(fieldList);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      headers.map((item) => ({
        [item]: null,
      })),
    );
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, `${workObjectName}模版.xlsx`);
  }, [spaceId, workItemTypeKey, fieldList]);

  return (
    <React.Fragment>
      <Button
        icon={<IconDownload />}
        theme={'borderless'}
        type={'primary'}
        onClick={handleDownload}>
        下载模版
      </Button>
    </React.Fragment>
  );
}

export default memo(ExcelGenerator);
