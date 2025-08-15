import React, { memo, useCallback, useContext, useMemo } from 'react';
import { Button, Checkbox, Layout, Space } from '@douyinfe/semi-ui';
import { ExcelImportContext } from './IContext';
import { Step } from '../../types';

const SemiFooter = Layout.Footer;

function Footer() {
  const {
    loading,
    currStep,
    isNameFieldExist,
    ignoreErrorData,
    setIgnoreErrorData,
    fileItem,
    errorInfo,
    setCurrStep,
    setLoading,
    data,
    enableTemplateList,
  } = useContext(ExcelImportContext);

  const handleCancel = useCallback(() => {
    if (currStep === Step.UPLOAD) {
      window.JSSDK.containerModal?.close?.();
    }
    if (currStep === Step.PREVIEW) {
      setCurrStep(Step.UPLOAD);
    }
    if (currStep === Step.EXECUTE) {
      window.JSSDK.containerModal?.close?.();
    }
  }, [currStep, setCurrStep]);

  const handleOk = useCallback(() => {
    if (currStep === Step.UPLOAD) {
      setCurrStep(Step.PREVIEW);
    }
    if (currStep === Step.PREVIEW) {
      setLoading(true);
      setCurrStep(Step.EXECUTE);
    }
    if (currStep === Step.EXECUTE) {
      window.JSSDK.containerModal?.close?.();
    }
  }, [currStep, setCurrStep, setLoading]);

  const disabled = useMemo(() => {
    if (currStep === Step.UPLOAD) {
      if (fileItem) {
        return false;
      }
      return true;
    }
    if (currStep === Step.PREVIEW) {
      if (enableTemplateList.length === 0) {
        return true;
      }
      if (!isNameFieldExist) {
        return true;
      }
      if (data?.length === 0) {
        return true;
      }
      const errors = Object.values(errorInfo).filter(
        (item) => item.message && item.message.length,
      );
      if (errors.length && !ignoreErrorData) {
        return true;
      }
      return false;
    }
    if (currStep === Step.EXECUTE) {
      return loading;
    }
    return true;
  }, [
    currStep,
    fileItem,
    errorInfo,
    ignoreErrorData,
    isNameFieldExist,
    loading,
    data,
    enableTemplateList,
  ]);

  return (
    <SemiFooter className="footer">
      <Space>
        {!loading && currStep === Step.PREVIEW ? (
          <Checkbox
            disabled={!isNameFieldExist}
            value={ignoreErrorData}
            onChange={(value) => {
              setIgnoreErrorData(value.target.checked ?? false);
            }}>
            忽略错误数据, 继续导入
          </Checkbox>
        ) : null}
        <Button
          onClick={handleCancel}
          theme={'light'}
          type={'tertiary'}>
          {currStep === Step.UPLOAD || currStep === Step.EXECUTE
            ? '取消'
            : '上一步'}
        </Button>
        <Button
          onClick={handleOk}
          disabled={disabled}
          theme={'solid'}
          type={'primary'}>
          {currStep === Step.EXECUTE ? '确认' : '下一步'}
        </Button>
      </Space>
    </SemiFooter>
  );
}

export default memo(Footer);
