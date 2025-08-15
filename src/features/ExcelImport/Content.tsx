import { memo, useContext } from 'react';
import { Layout } from '@douyinfe/semi-ui';
import Upload from './Upload';
import { ExcelImportContext } from './IContext';
import { Step } from '../../types';
import Preview from './Preview';
import Progress from './Progress';
const SemiContent = Layout.Content;

function Content() {
  const { currStep } = useContext(ExcelImportContext);

  return (
    <SemiContent className="content">
      {currStep === Step.UPLOAD ? <Upload /> : null}
      {currStep === Step.PREVIEW ? <Preview /> : null}
      {currStep === Step.EXECUTE ? <Progress /> : null}
    </SemiContent>
  );
}

export default memo(Content);
