import { useEffect } from 'react';

const APP_NAME = 'S.W.P';

/**
 * Custom hook để cập nhật tiêu đề trang (document.title)
 * @param pageTitle - Tiêu đề của trang hiện tại
 */
export const usePageTitle = (pageTitle: string) => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${APP_NAME} - ${pageTitle}`;

    // Cleanup: khôi phục tiêu đề trước đó khi component unmount
    return () => {
      document.title = previousTitle;
    };
  }, [pageTitle]);
};

export default usePageTitle;
