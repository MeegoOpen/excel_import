import React, { memo, useContext } from 'react';
import { Steps, Layout } from '@douyinfe/semi-ui';
import { ExcelImportContext } from './IContext';
const Step = Steps.Step;
const SemiHeader = Layout.Header;

function Header() {
  const { currStep } = useContext(ExcelImportContext);

  return (
    <SemiHeader className="header">
      <Steps
        size={'small'}
        style={{ width: 624 }}
        type="basic"
        current={currStep}>
        <Step title="上传文件" />
        <Step title="预览" />
        <Step title="执行导入" />
      </Steps>
    </SemiHeader>
  );
}

export default memo(Header);
