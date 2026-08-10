import { Typography, Row, Col, Button, Carousel } from "antd";
import {
  HomeOutlined,
  EnvironmentOutlined,
  CalendarOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import picture1 from "@/assets/images/picture1.jpg";
import picture2 from "@/assets/images/picture2.jpg";
import picture3 from "@/assets/images/picture3.jpg";
import picture4 from "@/assets/images/picture4.jpg";
import picture5 from "@/assets/images/picture5.jpg";
import picture6 from "@/assets/images/picture6.jpg";
import picture7 from "@/assets/images/picture7.jpg";
import picture8 from "@/assets/images/picture8.jpg";
import picture9 from "@/assets/images/picture9.jpg";

const { Title, Text, Paragraph } = Typography;

const featureList = [
  {
    icon: <HomeOutlined />,
    title: "优质教育资源",
    desc: "学校拥有完善的教育设施和优秀的师资力量",
    color: "#2d6a9f",
    bg: "#e6f4ff",
  },
  {
    icon: <EnvironmentOutlined />,
    title: "便捷的地理位置",
    desc: "位于市中心，交通便利，环境优美",
    color: "#3d8bb4",
    bg: "#f0f9ff",
  },
  {
    icon: <CalendarOutlined />,
    title: "灵活的预约时间",
    desc: "支持多种时间段的预约，满足您的需求",
    color: "#1a3a5c",
    bg: "#f0f5ff",
  },
  {
    icon: <TeamOutlined />,
    title: "热情的接待服务",
    desc: "专业的接待团队，为您提供贴心的服务",
    color: "#40a9ff",
    bg: "#e6f7ff",
  },
];

const noticeList = [
  "请提前1-3个工作日提交访客申请，以便我们更好地为您安排接待事宜。",
  "访客入校时需携带有效身份证件，并在校门口安保处登记。",
  "请遵守学校的各项规章制度，文明参观。",
  "如需取消或变更预约，请提前联系我们。",
  "未经预约的访客，学校有权拒绝入校。",
];

const carouselImages = [
  { src: picture1, alt: "校园风景1" },
  { src: picture2, alt: "校园风景2" },
  { src: picture3, alt: "校园风景3" },
  { src: picture4, alt: "校园风景4" },
  { src: picture5, alt: "校园风景5" },
  { src: picture6, alt: "校园风景6" },
  { src: picture7, alt: "校园风景7" },
  { src: picture8, alt: "校园风景8" },
  { src: picture9, alt: "校园风景9" },
];

const DashboardPage = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100%", background: "#f5f7fa" }}>
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 24px 0",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Title
            level={1}
            style={{
              color: "#1a3a5c",
              marginBottom: 8,
              fontSize: 38,
              fontWeight: 700,
              letterSpacing: 1.5,
            }}
          >
            欢迎访问河南科技学院
          </Title>
          <div
            style={{
              width: 50,
              height: 3,
              background: "#2d6a9f",
              borderRadius: 2,
              margin: "0 auto 16px",
              opacity: 0.7,
            }}
          />
          <Paragraph
            style={{
              color: "#555",
              fontSize: 15,
              maxWidth: 520,
              margin: "0 auto",
              lineHeight: 1.8,
            }}
          >
            感谢您选择访问我们的学校，请通过预约系统提交您的访问申请，我们会尽快为您处理。
          </Paragraph>
        </div>

        <Carousel
          autoplay
          style={{
            marginBottom: 28,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          {carouselImages.map((img, idx) => (
            <div key={idx}>
              <div style={{ position: "relative", height: 260 }}>
                <img
                  src={img.src}
                  alt={img.alt}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "linear-gradient(transparent, rgba(0,0,0,0.5))",
                    padding: "20px 24px 16px",
                    color: "#fff",
                  }}
                >
                  <Text
                    style={{ color: "#fff", fontSize: 16, fontWeight: 500 }}
                  >
                    {img.alt}
                  </Text>
                </div>
              </div>
            </div>
          ))}
        </Carousel>

        <Row gutter={[20, 20]} style={{ marginBottom: 28 }}>
          {featureList.map((item, idx) => (
            <Col xs={24} sm={12} md={6} key={idx}>
              <div
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "28px 20px",
                  textAlign: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "all 0.3s",
                  cursor: "default",
                  height: 180,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(0,0,0,0.06)";
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: item.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontSize: 26,
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>
                <Title level={5} style={{ marginBottom: 8 }}>
                  {item.title}
                </Title>
                <Text
                  type="secondary"
                  style={{ fontSize: 13, lineHeight: 1.6 }}
                >
                  {item.desc}
                </Text>
              </div>
            </Col>
          ))}
        </Row>

        <div style={{ display: "flex", gap: 20, paddingBottom: 40 }}>
          <div
            style={{
              flex: 1,
              background: "#fff",
              borderRadius: 12,
              padding: "24px 28px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
              }}
            >
              <SafetyCertificateOutlined
                style={{ fontSize: 20, color: "#2d6a9f" }}
              />
              <Title level={5} style={{ margin: 0 }}>
                访客须知
              </Title>
            </div>
            {noticeList.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: 10,
                  marginBottom: idx < noticeList.length - 1 ? 12 : 0,
                }}
              >
                <div
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "#e6f4ff",
                    color: "#2d6a9f",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 600,
                    marginTop: 2,
                  }}
                >
                  {idx + 1}
                </div>
                <Text
                  style={{ fontSize: 14, color: "#555", lineHeight: "22px" }}
                >
                  {item}
                </Text>
              </div>
            ))}
          </div>

          <div
            style={{
              width: 300,
              background:
                "linear-gradient(135deg, #1a3a5c 0%, #2d6a9f 50%, #3d8bb4 100%)",
              borderRadius: 12,
              padding: "28px 24px",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Title level={4} style={{ color: "#fff", marginBottom: 12 }}>
              快速预约入校
            </Title>
            <Paragraph
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 14,
                marginBottom: 24,
                lineHeight: 1.8,
              }}
            >
              在线提交访客申请，审核通过后即可入校参观，流程简单便捷。
            </Paragraph>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate("/user/apply")}
              style={{
                background: "#fff",
                color: "#2d6a9f",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                height: 42,
              }}
            >
              立即申请 <RightOutlined />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
