import {
  createContext,
  Dispatch,
  memo,
  SetStateAction,
  useEffect,
  useState,
} from 'react';
import Content from './Content';
import {
  CreateCaseParams,
  ErrorInfo,
  FileItem,
  FieldItem,
  Step,
} from '../../types';
import Header from './Header';
import Footer from './Footer';
import { Layout } from '@douyinfe/semi-ui';
import './index.css';
import { BriefTemplate } from '@lark-project/js-sdk';

export const ExcelImportContext = createContext(
  {} as {
    spaceId: string;
    workItemTypeKey: string;
    currStep: number;
    setCurrStep: Dispatch<SetStateAction<number>>;
    fileItem: FileItem | undefined;
    setFileItem: Dispatch<SetStateAction<FileItem | undefined>>;
    data: CreateCaseParams[];
    setData: Dispatch<SetStateAction<CreateCaseParams[]>>;
    ignoreErrorData: boolean;
    setIgnoreErrorData: Dispatch<SetStateAction<boolean>>;
    loading: boolean;
    setLoading: Dispatch<SetStateAction<boolean>>;
    errorInfo: ErrorInfo;
    setErrorInfo: Dispatch<SetStateAction<ErrorInfo>>;
    isNameFieldExist: boolean;
    setIsNameFieldExist: Dispatch<SetStateAction<boolean>>;
    isOverLimit: boolean;
    setIsOverLimit: Dispatch<SetStateAction<boolean>>;
    fieldList: FieldItem[];
    setFiledList: Dispatch<SetStateAction<FieldItem[]>>;
    enableTemplateList: BriefTemplate[];
  },
);

function IContext(props: { spaceId: string; workItemTypeKey: string }) {
  const { spaceId, workItemTypeKey } = props;
  const [currStep, setCurrStep] = useState(Step.UPLOAD);
  const [fileItem, setFileItem] = useState<FileItem>();
  const [fieldList, setFiledList] = useState<FieldItem[]>([]);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo>({});
  const [isNameFieldExist, setIsNameFieldExist] = useState(true);
  const [data, setData] = useState<CreateCaseParams[]>([]);
  const [ignoreErrorData, setIgnoreErrorData] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [enableTemplateList, setEnableTemplateList] = useState<BriefTemplate[]>(
    [],
  );

  useEffect(() => {
    if (!spaceId || !workItemTypeKey) {
      return;
    }
    window.JSSDK.WorkObject.load({
      spaceId,
      workObjectId: workItemTypeKey,
    }).then(async (workObj) => {
      const templateList = await workObj.getTemplateList();
      setEnableTemplateList(
        templateList.filter((item) => !item.disabled) || [],
      );
    });
  }, [spaceId, workItemTypeKey]);

  return (
    <ExcelImportContext.Provider
      value={{
        spaceId,
        workItemTypeKey,
        currStep,
        setCurrStep,
        fileItem,
        setFileItem,
        data,
        setData,
        ignoreErrorData,
        setIgnoreErrorData,
        loading,
        setLoading,
        errorInfo,
        setErrorInfo,
        isNameFieldExist,
        setIsNameFieldExist,
        isOverLimit,
        setIsOverLimit,
        fieldList,
        setFiledList,
        enableTemplateList,
      }}>
      <Layout className="excel-import-layout">
        <Header />
        <Content />
        <Footer />
      </Layout>
    </ExcelImportContext.Provider>
  );
}

export default memo(IContext);
