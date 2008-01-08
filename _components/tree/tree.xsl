<?xml
	version="1.0"
	encoding="utf-8"
	?>
<xsl:stylesheet
	version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	>
<xsl:output
	method="html"
	encoding="utf-8"
	omit-xml-declaration="yes"
	standalone="no"
	indent="no"
	media-type="text/html"
	/>

<xsl:template match="/">
	<xsl:call-template name="nodes">
		<xsl:with-param name="node" select="/root" />
	</xsl:call-template>
</xsl:template>

<xsl:template name="nodes">
	<xsl:param name="node" />
	<ul> 
	<xsl:for-each select="$node/item">
		<li>
		<xsl:attribute name="id"><xsl:value-of select="@id" /></xsl:attribute>
		<xsl:attribute name="rel"><xsl:value-of select="@type" /></xsl:attribute>
		<xsl:attribute name="class">
			<xsl:if test="position() = last()"> last </xsl:if>
			<xsl:choose>
				<xsl:when test="@state = 'open'"> open </xsl:when>
				<xsl:when test="count(./item) &gt; 0 or @hasChildren &gt; 0"> closed </xsl:when>
				<xsl:otherwise> </xsl:otherwise>
			</xsl:choose>
		</xsl:attribute>
			<xsl:for-each select="content/name">
				<a href="#">
				<xsl:attribute name="class"><xsl:value-of select="@lang" /></xsl:attribute>
				<xsl:attribute name="style">
					<xsl:choose>
						<xsl:when test="string-length(attribute::icon) > 0">background-image:url(<xsl:value-of select="@icon" />);</xsl:when>
						<xsl:otherwise>padding-left:5px !important;</xsl:otherwise>
					</xsl:choose>
				</xsl:attribute>
					<xsl:value-of select="current()" />
				</a>

			</xsl:for-each>
			<xsl:if test="count(./item) > 0 or @hasChildren &gt; 0">
				<xsl:call-template name="nodes">
					<xsl:with-param name="node" select="current()" />
				</xsl:call-template>
			</xsl:if>
		</li>
	</xsl:for-each>
	</ul>
</xsl:template>

</xsl:stylesheet>