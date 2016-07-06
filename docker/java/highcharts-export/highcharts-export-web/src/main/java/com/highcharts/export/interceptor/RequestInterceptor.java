/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package com.highcharts.export.interceptor;

import com.highcharts.export.service.MonitorService;
import java.io.IOException;
import java.util.Date;
import java.util.Map;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.apache.log4j.Logger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.servlet.handler.HandlerInterceptorAdapter;

/**
 *
 * @author gert
 */
public class RequestInterceptor extends HandlerInterceptorAdapter {
	private static final Logger logger = Logger.getLogger(RequestInterceptor.class.getName());
	private static final String lineSeparator = System.getProperty("line.separator");

	@Autowired 
    private MonitorService monitor;


	private String extractPostRequestBody(HttpServletRequest request) throws IOException {
		StringBuilder sb = new StringBuilder();
		Map<String, String[]> paramMap = request.getParameterMap();
		
		for (Map.Entry<String, String[]> entry : paramMap.entrySet()) {            
            sb.append("\t");
			sb.append(entry.getKey())
				.append("=");
                String[] values = entry.getValue();
                for (int i = 0; i < values.length; i++) {
                    sb.append(values[i]);
                    if (i < values.length) {
                        sb.append(", ");
                    } 
                }
				sb.append(lineSeparator);
		}
		return sb.toString();
	}

	@Override
	public boolean preHandle(HttpServletRequest request,
            HttpServletResponse response, Object handler) throws Exception {        
		request.setAttribute("startTime", System.currentTimeMillis());
		monitor.add();
        
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
            HttpServletResponse response, Object handler, Exception ex)
            throws Exception {

        long startTime = (Long) request.getAttribute("startTime");
		int httpStatus = response.getStatus();

		if (httpStatus == 500) {
			monitor.addError();
            logger.info(String.format("[Time=%s :: Time taken(ms)=%d :: RequestMethod=%s :: Status=%d :: Referer=%s :: Request parameters=%s]",
					new Date().toString(),
					(System.currentTimeMillis() - startTime),
					request.getMethod(),
					response.getStatus(),
					request.getHeader("referer"), // <-- intentional misspelling (http legacy)
					extractPostRequestBody(request)));
		} else {
			logger.info(String.format("[Time=%s :: Time taken(ms)=%d :: RequestMethod=%s :: Status=%d :: Referer=%s]",
					new Date().toString(),
					(System.currentTimeMillis() - startTime),
					request.getMethod(),
					response.getStatus(),
					request.getHeader("referer")));
        }

        logger.info(monitor.report());
    }

}
