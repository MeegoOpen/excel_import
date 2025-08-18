import React, { memo, useCallback, useContext } from 'react';
import { Banner, Button, Upload as SemiUpload } from '@douyinfe/semi-ui';
import { IconFile, IconClose } from '@douyinfe/semi-icons';
import { ExcelImportContext } from './IContext';
import { FileItem } from '../../types';
import ExcelGenerator from './ExcelGenerator';

function Upload() {
  const { setFileItem, fileItem } = useContext(ExcelImportContext);

  const handleBeforeUpload = useCallback(
    (file: { file: FileItem; fileList: FileItem[] }) => {
      const blob = file.file.fileInstance;
      if (blob) {
        setFileItem(file.file);
        window.JSSDK.toast.success('上传成功');
      } else {
        window.JSSDK.toast.error('文件已损坏');
      }
      return false;
    },
    [setFileItem],
  );

  return (
    <>
      <Tips />
      <ExcelGenerator />
      <SemiUpload
        style={{ marginTop: 16 }}
        action={''}
        draggable={true}
        dragMainText={'点击上传文件或拖拽文件到这里'}
        dragSubText="仅支持.xlsx, .csv格式的文件"
        accept={'.xlsx, .csv'}
        fileList={[]}
        beforeUpload={handleBeforeUpload}
      />
      {fileItem ? (
        <div
          style={{
            marginTop: 16,
          }}
          className="semi-upload-file-card">
          <div className="semi-upload-file-card-preview semi-upload-file-card-preview-placeholder">
            <IconFile />
          </div>
          <div className="semi-upload-file-card-info-main">
            <div className="semi-upload-file-card-info-main-text">
              {fileItem.name}
            </div>
          </div>
          <Button
            className="semi-upload-file-card-close"
            theme={'borderless'}
            type={'tertiary'}
            icon={<IconClose />}
            onClick={() => {
              setFileItem(undefined);
            }}></Button>
        </div>
      ) : null}
    </>
  );
}

const Tips = memo(() => (
  <Banner
    style={{ margin: '15px 0' }}
    type="info"
    closeIcon={null}
    fullMode={false}
    description={
      <div>
        <div style={{ fontWeight: 500 }}>支持的字段类型：</div>
        <div>
          当前版本已支持文本、富文本、人员类型、选项类型、URL 链接类型、关联工作项、单选按钮、级联类型、复合字段，富文本字段仅支持纯文本内容。
        </div>
        <div style={{ marginTop: 4, fontWeight: 500 }}>使用方式：</div>
        <div>
          1.
          下载模板，根据导入需求可对表头进行删减，导入使用标题名称进行匹配，因此切勿修改表头名称；
        </div>
        <div>
          2.
          根据模板进行数据添加，其中选项类型、级联类型字段填入选项名称，关联工作项值填入对应关联的实例id值；
        </div>
        <div>3. 为多选时，使用竖线分隔，如 选项1|选项2；</div>
        <div>
          4. 流程模板类型字段可以不添加，不添加时默认使用第一个模板进行创建。
        </div>
      </div>
    }
  />
));

export default memo(Upload);
